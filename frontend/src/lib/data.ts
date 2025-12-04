// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4

export interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  title: string;
  url: string;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  value: number;
}

export type Data = {
  nodes: Node[];
  links: Link[];
};

export const data = {
  nodes: [
    { id: 'Myriel',  x: 0, y: 600,group: 'team1' },
    { id: 'Anne',  x: 0, y: 0,group: 'team1' },
    { id: 'Gabriel', group: 'team1' },
    { id: 'Mel', group: 'team1' },
    { id: 'Yan', group: 'team2' },
    { id: 'Tom', group: 'team2' },
    { id: 'Cyril', group: 'team2' },
    { id: 'Tuck', group: 'team2' },
    { id: 'Antoine', group: 'team3' },
    { id: 'Rob', group: 'team3' },
    { id: 'Napoleon', group: 'team3' },
    { id: 'Toto', group: 'team4' },
    { id: 'Tutu', group: 'team4' },
    { id: 'Titi', group: 'team4' },
    { id: 'Tata', group: 'team4' },
    { id: 'Turlututu', group: 'team4' },
    { id: 'Tita', group: 'team4' },
  ],
  links: [
    { source: 'Myriel', target: 'Myriel', value: 1 },
    { source: 'Anne', target: 'Myriel', value: 1 },
    { source: 'Gabriel', target: 'Myriel', value: 1 },
    { source: 'Gabriel', target: 'Anne', value: 1 },
    { source: 'Yan', target: 'Anne', value: 1 },
    { source: 'Yan', target: 'Tom', value: 1 },
    { source: 'Yan', target: 'Cyril', value: 1 },
    { source: 'Yan', target: 'Tuck', value: 1 },
  ],
};
