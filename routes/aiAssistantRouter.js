const express = require("express");
const router = express.Router();
const axios = require("axios");
const {
  HumanMessage,
  AIMessage,
  SystemMessage,
} = require("@langchain/core/messages");

const CustomChatMessageHistory = require("../CustomChatMessageHistory");
const history = new CustomChatMessageHistory();

const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;

router.get("/welcome", (req, res) => {
  res.status(200).json({ message: "Welcome to the AI Assistant API" });
});

router.post("/sendmessage", async (req, res) => {
  console.log(req.body);
  const messageText = req.body.messageText;
  const sessionId = req.body.sessionId;
  const downloadUrl = req.body.downloadUrl;

  const temp = await history.getMessages(sessionId);
  if (temp.length === 0) {
    const systemMessage = new SystemMessage(
      "You are an AI assistant that gives answers for questions."
    );
    history.addMessage(systemMessage, sessionId);
  }

  if (downloadUrl) {
    const response = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });
    const base64data = Buffer.from(response.data, "binary").toString("base64");

    await history.addMessage(new HumanMessage(base64data), sessionId, true);

    if (messageText) {
      await history.addMessage(new HumanMessage(messageText), sessionId);
    }
  } else {
    await history.addMessage(new HumanMessage(messageText), sessionId);
  }

  let data = JSON.stringify({
    enhancements: {
      ocr: {
        enabled: true,
      },
      grounding: {
        enabled: true,
      },
    },
    messages: await history.getMessages(sessionId),
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 800,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: apiUrl,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    data: data,
  };

  try {
    const r = await axios.request(config);
    await history.addMessage(
      new AIMessage(r.data.choices[0].message.content),
      sessionId
    );
    //await context.sendActivity(r.data.choices[0].message.content);

    res.status(200).json({ res: r.data.choices[0].message.content });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

module.exports = router;

// class AIAssistant {
//   constructor() {
//     this.apiKey = "e8201fcbec7643b2b08966d20e2e3487";
//     this.apiUrl = 'https://ai-copilotlabs8085049134634.openai.azure.com/openai/deployments/gpt-4-vision/chat/completions?api-version=2024-02-15-preview';
//   }

//   async sendMessage(messageText, imagePath) {
//     let data;
//     let imageData = null;

//     if (imagePath) {
//       // Read the image file and convert it to base64
//       try {
//         imageData = fs.readFileSync(imagePath, { encoding: 'base64' });
//       } catch (error) {
//         console.error("Error reading image file:", error);
//         return null;
//       }

//       // Construct the request payload with image and text
//       data = JSON.stringify({
//         "messages": [
//           {
//             "role": "system",
//             "content": [
//               {
//                 "type": "text",
//                 "text": "You are an AI assistant that helps people find information in pictures."
//               }
//             ]
//           },
//           {
//             "role": "user",
//             "content": [
//               {
//                 "type": "image_url",
//                 "image_url": {
//                   "url": `data:image/jpeg;base64,${imageData}`
//                 }
//               },
//               {
//                 "type": "text",
//                 "text": messageText
//               }
//             ]
//           }
//         ],
//         "temperature": 0.7,
//         "top_p": 0.95,
//         "max_tokens": 800
//       });
//     } else {
//       // Construct the request payload with text only
//       data = JSON.stringify({
//         "messages": [
//           {
//             "role": "system",
//             "content": [
//               {
//                 "type": "text",
//                 "text": "You are an AI assistant that helps people find information."
//               }
//             ]
//           },
//           {
//             "role": "user",
//             "content": [
//               {
//                 "type": "text",
//                 "text": messageText
//               }
//             ]
//           }
//         ],
//         "temperature": 0.7,
//         "top_p": 0.95,
//         "max_tokens": 800
//       });
//     }

//     const config = {
//       method: 'post',
//       maxBodyLength: Infinity,
//       url: this.apiUrl,
//       headers: {
//         'Content-Type': 'application/json',
//         'api-key': this.apiKey
//       },
//       data: data
//     };

//     try {
//       const response = await axios.request(config);
//       return response.data.choices[0].message.content;
//     } catch (error) {
//       console.log(error);
//       return null;
//     }
//   }
// }

// module.exports = AIAssistant;
