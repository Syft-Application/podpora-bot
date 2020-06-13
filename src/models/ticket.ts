// // const request = require('request');
// const jiraApiUrl = 'https://syftapp.atlassian.net/rest/api/3/';
// const jiraUsername = process.env.JIRA_USERNAME || '';
// const jiraApiToken = process.env.JIRA_API_TOKEN || '';

// async function boardAndIssueType(state) {
//     switch (state) {
//         case 'task':
//             return ['API2', 'Task'];
//         case 'data':
//             return ['SUP', 'Data Request'];
//         case 'bug':
//             return ['SUP', 'Bug'];
//         default:
//             throw new Error('type of issue and board must be defined');
//     }
// }

// async function ticketBody(ts) {
//     const state, user_name, title, description, support_channel_id;

//     const channel_url = `https://syftapp.slack.com/archives/${support_channel_id}/p${ts}`;
//     const desc = `Submitted by: ${user_name}\n\n${description}\n\nSlack thread: ${channel_url}`;
//     const [board, issueType] = boardAndIssueType(state);


//     const body = {
//         fields: {
//             summary: title,
//             issuetype: {
//                 name: issueType,
//             },
//             project: {
//                 key: board,
//             },
//             description: {
//                 type: 'doc',
//                 version: 1,
//                 content: [
//                     {
//                         type: 'paragraph',
//                         content: [
//                             {
//                                 text: desc,
//                                 type: 'text',
//                             },
//                         ],
//                     },
//                 ],
//             },
//         },
//     };

//     if (board === 'API2') {
//         body.fields.customfield_10601 = {
//             id: '10101',
//             value: '10101[Both]', // 10102[Syft], 10103[SyftForce]
//         };
//     }

//     return body;
// }

// async function createTicket(thread_ts) {
//     const authorization = `Basic ${Buffer.from(`${jiraUsername}:${jiraApiToken}`).toString('base64')}`;
//     const bodyData = ticketBody(thread_ts);
//     let response;

//     const options = {
//         method: 'POST',
//         url: `${jiraApiUrl}issue`,
//         headers: {
//             Authorization: authorization,
//             Accept: 'application/json',
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(bodyData),
//     };

//     await request(options, (error, res) => {
//         if (error) {
//             throw new Error(error);
//         } else {
//             response = res;
//         }
//     });

//     const { id, key, self } = JSON.parse(response.body);
//     return response;
// }

// module.exports = {
//     createTicket,
// };

// import bcrypt from "bcrypt-nodejs";
// import crypto from "crypto";
// import mongoose from "mongoose";

// export type UserDocument = mongoose.Document & {
//     email: string;
//     password: string;
//     passwordResetToken: string;
//     passwordResetExpires: Date;

//     facebook: string;
//     tokens: AuthToken[];

//     profile: {
//         name: string;
//         gender: string;
//         location: string;
//         website: string;
//         picture: string;
//     };

//     comparePassword: comparePasswordFunction;
//     gravatar: (size: number) => string;
// };

// type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;

// export interface AuthToken {
//     accessToken: string;
//     kind: string;
// }

// const userSchema = new mongoose.Schema({
//     email: { type: String, unique: true },
//     password: String,
//     passwordResetToken: String,
//     passwordResetExpires: Date,

//     facebook: String,
//     twitter: String,
//     google: String,
//     tokens: Array,

//     profile: {
//         name: String,
//         gender: String,
//         location: String,
//         website: String,
//         picture: String
//     }
// }, { timestamps: true });

// /**
//  * Password hash middleware.
//  */
// userSchema.pre("save", function save(next) {
//     const user = this as UserDocument;
//     if (!user.isModified("password")) { return next(); }
//     bcrypt.genSalt(10, (err, salt) => {
//         if (err) { return next(err); }
//         bcrypt.hash(user.password, salt, undefined, (err: mongoose.Error, hash) => {
//             if (err) { return next(err); }
//             user.password = hash;
//             next();
//         });
//     });
// });

// const comparePassword: comparePasswordFunction = function(candidatePassword, cb) {
//     bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
//         cb(err, isMatch);
//     });
// };

// userSchema.methods.comparePassword = comparePassword;

// /**
//  * Helper method for getting user's gravatar.
//  */
// userSchema.methods.gravatar = function(size: number = 200) {
//     if (!this.email) {
//         return `https://gravatar.com/avatar/?s=${size}&d=retro`;
//     }
//     const md5 = crypto.createHash("md5").update(this.email).digest("hex");
//     return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
// };

// export const User = mongoose.model<UserDocument>("User", userSchema);
