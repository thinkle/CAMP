export class WorkerPool {
  private workers: Worker[] = [];
  private workerBusyStatus: Map<Worker, boolean> = new Map(); // false = idle, true = busy

  private taskQueue: any[] = [];
  private maxWorkerCount: number;
  private workerScript: string;

  // A unified onmessage callback that handles all worker messages
  public onmessage: (message: MessageEvent) => void = () => {};

  constructor(
    workerScript: string,
    maxWorkerCount: number = navigator.hardwareConcurrency || 4
  ) {
    this.workerScript = workerScript;
    this.maxWorkerCount = maxWorkerCount;
    console.log("workerPool: WORKER HAS MAX THREADS OF ", this.maxWorkerCount);
  }

  private createWorker(): Worker {
    console.log("workerPool: CREATING NEW WORKER");
    const worker = new Worker(this.workerScript);
    worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
    this.workers.push(worker);
    this.workerBusyStatus.set(worker, false); // Initially idle
    return worker;
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent) {
    // 1. Forward all messages to the public onmessage callback

    let id = this.workers.indexOf(worker) + 1;
    // 2. If the worker reports it's done with its task:
    const message = event.data;
    message.id = id;

    if (this.onmessage) {
      this.onmessage(event);
    }

    if (message && message.complete) {
      // Mark worker as idle
      this.workerBusyStatus.set(worker, false);
      // If there's a queued task, immediately assign it
      this.assignTask(worker);
    }
  }

  private assignTask(worker: Worker) {
    if (this.taskQueue.length > 0) {
      // Pull the next task off the queue
      const task = this.taskQueue.shift();
      // Mark worker as busy
      this.workerBusyStatus.set(worker, true);
      // Post the task message to the worker
      worker.postMessage(task);
    }
  }

  public postMessage(message: any) {
    // 1. Find an idle worker if one exists

    if (message.id && message.type == "stop") {
      let worker = this.workers[message.id - 1];
      console.log("Tell worker to stop!", worker);
      worker.postMessage(message);
      return;
    }

    console.log("workerPool: postMessage...", message);
    const idleWorker = this.workers.find((w) => !this.workerBusyStatus.get(w));
    if (idleWorker) {
      console.log("workerPool: Found idle worker, assigning task...");
      this.workerBusyStatus.set(idleWorker, true);
      idleWorker.postMessage(message);
      return;
    }

    // 2. No idle worker -- can we create a new one within the limit?
    if (this.workers.length < this.maxWorkerCount) {
      console.log("workerPool: Creating new worker to handle task...");
      const newWorker = this.createWorker();
      this.workerBusyStatus.set(newWorker, true);
      newWorker.postMessage(message);
      return;
    }
    console.log("workerPool: Unable to get a worker, queueing task...");
    // 3. Otherwise, queue the task until a worker is free
    this.taskQueue.push(message);
  }

  public terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.workerBusyStatus.clear();
    this.taskQueue = [];
  }
}
