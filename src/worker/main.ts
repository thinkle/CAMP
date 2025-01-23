import type { Schedule, Activity, StudentPreferences, ScheduleInfo } from "../types";


self.onmessage = (event) => {
    console.log('Received data',event.data);
    self.postMessage({message:'Hello from worker!'});
}

