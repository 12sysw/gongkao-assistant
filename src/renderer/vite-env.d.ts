/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENCENT_SDK_APP_ID: string;
  readonly VITE_TENCENT_SDK_SECRET_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@tencentcloud/chat' {
  const TencentCloudChat: any;
  export default TencentCloudChat;
}

declare module 'tim-upload-plugin' {
  const TIMUploadPlugin: any;
  export default TIMUploadPlugin;
}
