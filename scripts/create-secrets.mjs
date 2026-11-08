import { randomBytes,scryptSync } from 'node:crypto';
const password=randomBytes(18).toString('base64url');const salt=randomBytes(16).toString('hex');const digest=scryptSync(password,salt,32).toString('hex');
console.log('INITIAL PASSWORD (save privately):',password);
console.log('OFFICE_PASSWORD_HASH='+salt+':'+digest);
console.log('SESSION_SECRET='+randomBytes(32).toString('base64url'));
