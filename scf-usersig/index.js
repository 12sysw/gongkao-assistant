const TLSSigAPIv2 = require('tls-sig-api-v2');

const SDK_APP_ID = parseInt(process.env.SDK_APP_ID || '0', 10);
const SECRET_KEY = process.env.SECRET_KEY || '';

exports.main_handler = async (event) => {
  let body = {};
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const userID = body.userID;

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

  try {
    const api = new TLSSigAPIv2.Api(SDK_APP_ID, SECRET_KEY);
    const userSig = api.genUserSig(userID, 86400);

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
