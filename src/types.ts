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
  }

  export type Schedule = Assignment[];
  
  export type ScheduleInfo = {
    schedule : Schedule,
    score : number,
    alg : string,
    invalid : string | null,
    generation : number,
    id : string,
 }