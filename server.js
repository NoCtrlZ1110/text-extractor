const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000

// Function to read the image file as a buffer
const readImageFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// Function to post image as form data
const postImage = async (imageBuffer, endpointUrl) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('encoded_image', imageBuffer, {
      filename: 'image.jpg', // Set the filename (adjust as needed)
      contentType: 'image/jpeg', // Set the content type (adjust as needed)
    });

    // Make a POST request using axios with form data
    const response = await axios.post(endpointUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Extract data using regex
    const regexPattern = /",\[\[(\[".*?"\])\],"/;
    const match = response.data.match(regexPattern);

    if (match && match[1]) {
      const extractedData = match[1];
      return extractedData;
    } else {
      throw new Error('No data matched the regex pattern.');
    }
  } catch (error) {
    throw new Error(`Error posting image: ${error.message}`);
  }
};

app.get('/ping', async (req, res) => res.send('pong 🏓'))

app.get('/health', async (req, res) => res.send('ok'))

// Express route to handle file upload
app.post('/text-to-image', upload.single('image'), async (req, res) => {
  const { path } = req.file;
  const endpointUrl = 'https://lens.google.com/v3/upload';

  try {
    // Read the image file as a buffer
    const imageBuffer = await readImageFile(path);

    // Post the image to the endpoint and get the extracted data
    const extractedData = await postImage(imageBuffer, endpointUrl);
    const results = JSON.parse(extractedData);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  } finally {
    // Delete the uploaded file
    fs.unlink(path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
