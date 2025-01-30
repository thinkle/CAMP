import { FamilyClusters } from "./scheduler/hillclimbing/clusterSchedules";

export type ActivityPreference = {
  activity: string;
  weight: number;
};
export type PeerPreference = {
  peer: string;
  weight: number;
};
export type StudentPreferences = {
  identifier: string;
  activity: ActivityPreference[];
  peer: PeerPreference[];
};
export type Activity = {
  activity: string;
  capacity: number;
};
export type Assignment = {
  activity: string;
  student: string;
};

export type Schedule = Assignment[];

export type ScheduleInfo = {
  schedule: Schedule;
  score: number;
  alg: string;
  invalid: string | null;
  generation: number;
  id: string;
};

export type WorkerMessage = {
  complete?: boolean;
  type:
    | "improved"
    | "doneImproving"
    | "error"
    | "stopped"
    | "generated"
    | "evolved"
    | "started"
    | "clustered";
  map?: FamilyClusters;
  clusters?: ClusterInfo[];
  message: string;
  schedule?: ScheduleInfo;
  population?: ScheduleInfo[];
  count?: number;
  total?: number;
};

export type ClusterInfo = {
  reference: string;
  set: Set<Schedule>;
  infoSet: Set<ScheduleInfo>;
  avgScore: Number;
  bestScore: Number;
  bestSchedule: ScheduleInfo;
  name: string;
};
