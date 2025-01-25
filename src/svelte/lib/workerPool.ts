export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: any[] = [];
  private maxWorkerCount: number;
  private workerScript: string;

  // A unified onmessage callback that handles all worker messages
  public onmessage: (message: any) => void = () => {};

  constructor(workerScript: string, maxWorkerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerScript = workerScript;
    this.maxWorkerCount = maxWorkerCount;
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerScript);
    worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
    this.workers.push(worker);
    return worker;
  }

  private handleWorkerMessage(worker: Worker, event) {
    // Forward all messages to the public onmessage callback
    if (this.onmessage) {
      this.onmessage(event);
    }
    let message = event.data;

    // Handle task completion (stop or done messages)
    if (message.type === "stopped" || message.type === "done") {
      this.assignTask(worker);
    }
  }

  private assignTask(worker: Worker) {
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      worker.postMessage(task.message);
    }
  }

  public postMessage(message: any) {
    // Add the task to the queue
    this.taskQueue.push({ message });
    if (message.type === "stop") {
      // Then we stop everything...
      for (let worker of this.workers) {
        worker.postMessage({ type: "stop" });
      }
      return;
    }

    // Find an available worker or create a new one if needed
    const availableWorker =
      this.workers.find((w) => !this.taskQueue.some((t) => t.worker === w)) ||
      (this.workers.length < this.maxWorkerCount ? this.createWorker() : null);

    // Assign the task to an available worker
    if (availableWorker) {
      this.assignTask(availableWorker);
    }
  }

  public terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
  }
}