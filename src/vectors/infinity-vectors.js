const fetch = require('node-fetch').default;

/**
 * Gets the vector for the given text batch from an OpenAI compatible endpoint.
 * @param {string[]} texts - The array of texts to get the vector for
 * @returns {Promise<number[][]>} - The array of vectors for the texts
 */
async function getInfinityBatchVector(texts) {
    const url = "localhost:7999";
    const response = await fetch(`http://${url}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            input: texts,
            model: "intfloat/multilingual-e5-large",
            user: "sillytavern",
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.log('API request failed', response.statusText, text);
        throw new Error('API request failed');
    }

    const data = await response.json();

    if (!Array.isArray(data?.data)) {
        console.log('API response was not an array');
        throw new Error('API response was not an array');
    }

    // Sort data by x.index to ensure the order is correct
    data.data.sort((a, b) => a.index - b.index);

    const vectors = data.data.map(x => x.embedding);
    return vectors;
}

/**
 * Gets the vector for the given text from an OpenAI compatible endpoint.
 * @param {string} text - The text to get the vector for
 * @returns {Promise<number[]>} - The vector for the text
 */
async function getInfinityVector(text) {
    const vectors = await getInfinityBatchVector([text]);
    return vectors[0];
}

module.exports = {
    getInfinityVector,
    getInfinityBatchVector,
};
