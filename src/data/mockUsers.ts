export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', username: 'alice.j', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=4299e1&color=fff' },
  { id: '2', name: 'Bob Smith', username: 'bobsmith', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=48bb78&color=fff' },
  { id: '3', name: 'Charlie Brown', username: 'charlie.b', avatar: 'https://ui-avatars.com/api/?name=Charlie+Brown&background=ed8936&color=fff' },
  { id: '4', name: 'Diana Prince', username: 'diana', avatar: 'https://ui-avatars.com/api/?name=Diana+Prince&background=9f7aea&color=fff' },
  { id: '5', name: 'Edward Norton', username: 'edward.norton', avatar: 'https://ui-avatars.com/api/?name=Edward+Norton&background=f56565&color=fff' },
  { id: '6', name: 'Fiona Green', username: 'fiona.g', avatar: 'https://ui-avatars.com/api/?name=Fiona+Green&background=38b2ac&color=fff' },
  { id: '7', name: 'George Wilson', username: 'gwilson', avatar: 'https://ui-avatars.com/api/?name=George+Wilson&background=667eea&color=fff' },
  { id: '8', name: 'Helen Troy', username: 'helen.troy', avatar: 'https://ui-avatars.com/api/?name=Helen+Troy&background=fc8181&color=fff' },
  { id: '9', name: 'Ian Malcolm', username: 'ian.m', avatar: 'https://ui-avatars.com/api/?name=Ian+Malcolm&background=68d391&color=fff' },
  { id: '10', name: 'Julia Roberts', username: 'julia.r', avatar: 'https://ui-avatars.com/api/?name=Julia+Roberts&background=f6ad55&color=fff' }
];