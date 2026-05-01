const { GenTestUserSig } = require('tls-sig-api-v2');

// 环境变量（在 SCF 控制台配置）
const SDK_APP_ID = parseInt(process.env.SDK_APP_ID || '0', 10);
const SECRET_KEY = process.env.SECRET_KEY || '';

exports.main_handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const userID = body?.userID;

    if (!userID) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'userID is required' }),
      };
    }

    if (!SDK_APP_ID || !SECRET_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const generator = new GenTestUserSig(SDK_APP_ID, SECRET_KEY, 86400);
    const userSig = generator.genSig(userID);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userSig }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
