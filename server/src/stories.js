// Stories are data with {{cast}} tokens (rule 10). A test fails on an undefined token.
export const cast = {
  lab: 'this lab',
  pf: 'PingFederate 13.1',
  idm: 'PingIDM',
  connector: 'the sync connector',
  tag: '_pf_system_tag_ai_agent',
};

export const stories = [
  {
    id: 'S01-why-agent-identity',
    title: 'Why agents need identity, not just registration',
    text: 'In {{pf}}, an agent is an OAuth client: credentials, grants, scopes. But when {{connector}} gives that client a managed identity record in {{idm}}, the agent stops being an anonymous service account and becomes something with an owner, a status and a lifecycle.',
  },
  {
    id: 'S02-one-way-sync',
    title: 'One-way, filter-only sync',
    text: '{{lab}} reads {{pf}} through the Admin API, keeps only clients tagged {{tag}}, and creates or updates one record per agent in {{idm}}. Untagged clients are never touched, and nothing flows back.',
  },
  {
    id: 'S03-foundation-not-governance',
    title: 'A foundation, not full governance',
    text: 'The records {{connector}} creates in {{idm}} are the starting point for ownership, privileges and lifecycle management. Policy-based authorization for agents comes later — this lab honestly says it is not that solution.',
  },
];
