export interface LearnerGroup {
  id: string;
  name: string;
  memberCount: number;
}

export interface GroupPeerProgress {
  group: Pick<LearnerGroup, "id" | "name">;
  stages: { id: string; title: string }[];
  members: {
    name: string;
    isMe: boolean;
    stages: { id: string; percent: number; cleared: boolean }[];
  }[];
}
