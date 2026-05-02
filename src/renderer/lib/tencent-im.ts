import TencentCloudChat from '@tencentcloud/chat';
import TIMUploadPlugin from 'tim-upload-plugin';

// SDK_APP_ID 是公开标识，不是密钥，可以硬编码
// 这样打包后的应用无需配置环境变量即可工作
export const SDK_APP_ID = Number(import.meta.env.VITE_TENCENT_SDK_APP_ID) || 1600140076;

export const PRESET_ROOMS = [
  { id: 'gk001exchange', name: '行测交流', desc: '行测题目讨论与解题技巧' },
  { id: 'gk002essay', name: '申论讨论', desc: '申论写作交流与批改' },
  { id: 'gk003interview', name: '面试经验', desc: '面试技巧与经验分享' },
  { id: 'gk004general', name: '综合闲聊', desc: '备考日常交流' },
];

let chat: ReturnType<typeof TencentCloudChat.create> | null = null;

export function getChat(): ReturnType<typeof TencentCloudChat.create> {
  if (!chat) {
    chat = TencentCloudChat.create({ SDKAppID: SDK_APP_ID });
    chat.setLogLevel(1);
    chat.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });
  }
  return chat;
}

export async function loginIM(userID: string, userSig: string) {
  const instance = getChat();
  return instance.login({ userID, userSig });
}

export async function logoutIM() {
  const instance = getChat();
  try {
    await instance.logout();
  } catch (err: any) {
    // 忽略未登录时的错误
    console.warn('[Chat] logout:', err?.message || err);
  }
}

export async function setMyProfile(nick: string) {
  const instance = getChat();
  try {
    await instance.setMyProfile({ nick });
  } catch {}
}

export async function initPresetRooms(): Promise<void> {
  const instance = getChat();
  for (const room of PRESET_ROOMS) {
    try {
      await instance.createGroup({
        type: TencentCloudChat.TYPES.GRP_PUBLIC,
        name: room.name,
        groupID: room.id,
        introduction: room.desc,
        joinOption: TencentCloudChat.TYPES.JOIN_OPTIONS_FREE_ACCESS,
      });
    } catch (err: any) {
      // 10021=已被使用, 10025=自己创建过 — 都是正常的
      const code = err?.code || err?.ErrorCode;
      if (code !== 10021 && code !== 10025) {
        console.warn('[Chat] createGroup:', err?.message || err);
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

export async function joinGroup(groupID: string) {
  const instance = getChat();
  return instance.joinGroup({ groupID, type: TencentCloudChat.TYPES.GRP_PUBLIC });
}

export async function fetchHistory(conversationID: string, nextReqMessageID?: string) {
  const instance = getChat();
  const res = await instance.getMessageList({
    conversationID,
    count: 20,
    ...(nextReqMessageID ? { nextReqMessageID } : {}),
  });
  return {
    messages: (res.data.messageList as any[]) || [],
    nextReqMessageID: res.data.nextReqMessageID as string | undefined,
    isCompleted: res.data.isCompleted as boolean,
  };
}

export async function sendTextMessage(groupID: string, text: string) {
  const instance = getChat();
  const msg = instance.createTextMessage({
    to: groupID,
    conversationType: TencentCloudChat.TYPES.CONV_GROUP,
    payload: { text },
  });
  try {
    const result = await instance.sendMessage(msg);
    return result;
  } catch (err: any) {
    console.error('[Chat] sendMessage failed:', err?.code, err?.message);
    throw err;
  }
}

export async function sendImageMessage(groupID: string, file: File) {
  const instance = getChat();
  const msg = instance.createImageMessage({
    to: groupID,
    conversationType: TencentCloudChat.TYPES.CONV_GROUP,
    payload: { file },
  });
  return instance.sendMessage(msg);
}

export async function sendFileMessage(groupID: string, file: File) {
  const instance = getChat();
  const msg = instance.createFileMessage({
    to: groupID,
    conversationType: TencentCloudChat.TYPES.CONV_GROUP,
    payload: { file },
  });
  return instance.sendMessage(msg);
}

export function onMessageReceived(cb: (messages: any[]) => void) {
  const instance = getChat();
  const handler = (event: any) => cb(event.data);
  instance.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, handler);
  return () => instance.off(TencentCloudChat.EVENT.MESSAGE_RECEIVED, handler);
}

export function onReady(cb: () => void) {
  const instance = getChat();
  const handler = () => cb();
  instance.on(TencentCloudChat.EVENT.SDK_READY, handler);
  return () => instance.off(TencentCloudChat.EVENT.SDK_READY, handler);
}

export function onKickedOut(cb: (type: string) => void) {
  const instance = getChat();
  const handler = (event: any) => cb(event.data.type);
  instance.on(TencentCloudChat.EVENT.KICKED_OUT, handler);
  return () => instance.off(TencentCloudChat.EVENT.KICKED_OUT, handler);
}

export function onMessageRevoked(cb: (data: any[]) => void) {
  const instance = getChat();
  const handler = (event: any) => cb(event.data);
  instance.on(TencentCloudChat.EVENT.MESSAGE_REVOKED, handler);
  return () => instance.off(TencentCloudChat.EVENT.MESSAGE_REVOKED, handler);
}

export async function revokeMessage(message: any) {
  const instance = getChat();
  return instance.revokeMessage(message);
}

export async function fetchGroupMembers(groupID: string): Promise<any[]> {
  const instance = getChat();
  const res = await instance.getGroupMemberList({
    groupID,
    count: 100,
    offset: 0,
  });
  return (res.data.memberList as any[]) || [];
}
