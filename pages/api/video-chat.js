// /pages/api/transcript.js
import { YoutubeTranscript } from "youtube-transcript";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { OpenAI } from "langchain";

// Global variables
let chain;
let chatHistory = [];

// DO THIS SECOND
const initializeChain = async (initialPrompt, transcript) => {
  try {
    const model = new ChatOpenAI({
      temperature: 0.8,
      modelName: "gpt-3.5-turbo",
    });

    const vectorStore = await HNSWLib.fromDocuments(
      [{ pageContent: transcript }],
      new OpenAIEmbeddings()
    );

    chain = ConversationalRetrievalQAChain.fromLLM(
      model,
      vectorStore.asRetriever(),
      { verbose: true }
    );

    const response = await chain.call({
      question: initialPrompt,
      chat_history: chatHistory,
    });

    chatHistory.push({
      role: "assistant",
      content: response.text,
    });

    // console.log({ chatHistory });
    return response;
  } catch (error) {
    console.error(error);
  }
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { prompt, firstMsg } = req.body;

    // Then if it's the first message, we want to initialize the chain, since it doesn't exist yet
    if (firstMsg) {
      try {
        const initialPrompt = `I have provided you transcript of the video in the form of embeddings. Can you please summarize the video for me? `;

        chatHistory.push({
          role: "user",
          content: initialPrompt,
        });

        const transcriptResponse = await YoutubeTranscript.fetchTranscript(
          prompt
        );

        if (!transcriptResponse) {
          return res.status(500).json({ error: "Transcript not found" });
        }

        const transcript = transcriptResponse
          .map((item) => item.text)
          .join(" ");

        // const transcript =
        //   "Title: Five Key Steps to Building Wealth      Set Clear Goals: Define your financial objectives and create a roadmap to achieve them.      Diversify Income: Explore multiple income streams to increase earning potential and mitigate risks.      Learn and Adapt: Continuously educate yourself about finance, investments, and business to make informed decisions.      Manage Debt: Minimize debt and use credit responsibly to maintain a strong financial foundation.      Network and Collaborate: Surround yourself with successful individuals, build valuable connections, and seek mentorship for guidance and opportunities. Title: Elon Musk: Innovator and Visionary  1. Visionary Entrepreneur: Elon Musk is a visionary entrepreneur who has reshaped industries with his bold ideas and relentless pursuit of innovation.  2. Tesla and SpaceX: Musk's leadership in Tesla and SpaceX has revolutionized electric vehicles and propelled advancements in space exploration.  3. Renewable Energy Advocate: Musk's commitment to renewable energy is evident through his involvement in SolarCity and the development of the Powerwall battery.  4. Hyperloop and Boring Company: Musk's concepts of the Hyperloop and the Boring Company demonstrate his determination to transform transportation and alleviate urban congestion.  5. Inspiring the Future: Elon Musk's groundbreaking initiatives and audacious goals inspire a new generation of entrepreneurs and push the boundaries of human achievement.";

        // console.log({ transcript });

        const response = await initializeChain(initialPrompt, transcript);

        return res.status(200).json({ output: response, chatHistory });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching transcript" });
      }

      // do this third!
    } else {
      try {
        console.log("Received question");

        chatHistory.push({
          role: "user",
          content: prompt,
        });

        const response = await chain.call({
          question: prompt,
          chat_history: chatHistory,
        });

        chatHistory.push({
          role: "assistant",
          content: response.text,
        });

        // console.log({ response });

        return res.status(200).json({ output: response, chatHistory });
      } catch (error) {
        // Generic error handling
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred during the conversation." });
      }
    }
  }
}
