const axios = require("axios");

const summarizeChat = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn",
      {
        inputs: `Summarize in one short sentence:\n\n${text}`,
        parameters: {
          max_length: 1000,
          min_length: 20,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
        },
      },
    );

    res.json({
      summary: response.data[0].summary_text,
    });
  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Summarization failed",
    });
  }
};

const analyzeSentiment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment",
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
        },
      },
    );

    console.log("HF RESPONSE:", response.data);

    let result;

    if (Array.isArray(response.data[0])) {
      // case: [[{label, score}, ...]]
      result = response.data[0][0];
    } else {
      // case: [{label, score}]
      result = response.data[0];
    }
    let sentimentText = "Neutral";

    if (result.label === "LABEL_2") sentimentText = "Positive";
    if (result.label === "LABEL_0") sentimentText = "Negative";

    res.json({
      sentiment: sentimentText,
      confidence: result.score,
    });
  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Sentiment analysis failed",
    });
  }
};

module.exports = { summarizeChat, analyzeSentiment };
