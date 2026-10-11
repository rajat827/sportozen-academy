// Explicit operator action. No default or first-signup platform administrator.
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
const email=process.argv[2];
if(!email)throw new Error('Usage: node scripts/platform-admin.mjs <registered-account-email>');
const db=new DatabaseSync(resolve(process.env.SPORTOZEN_DATABASE_PATH??'.local/workspaces.sqlite'));
const user=db.prepare('SELECT id FROM "user" WHERE lower(email)=lower(?)').get(email);
if(!user)throw new Error('Register the account before assigning the operator role.');
db.prepare('INSERT OR IGNORE INTO platform_administrators(userId) VALUES(?)').run(user.id);
db.prepare('INSERT INTO workspace_audit(userId,action,at) VALUES(?,?,?)').run(user.id,'Platform administrator explicitly provisioned by local operator',new Date().toISOString());
console.log('Platform role assigned. Academy records still require a separate authorised membership.');
