import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {GoogleGenAI} from "@google/genai";
import axios from 'axios';

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GEN_AI_API = process.env.GEN_AI_API;
const ai = new GoogleGenAI({ apiKey: GEN_AI_API });
const SD_API_KEY = process.env.SD_API_KEY;
const url = 'https://api.scrapingdog.com/google_news/';
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
let lastGeneratedArray = [];
let og='';
let snippetsArray = [];

async function genai1(prompt,yr){
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `take this news into consideration ${prompt},${yr}
            ===End of News=== now generate ans array of strings.
            for example if the news is about sharks eating optic cables the array
            would look like ["sharks internet cables", "optic cable sharks",
            "internet shortage sharks"]...generate only 15 strings inside the array,do not just
            jumble the given words instead generate them in such a way it makes sense
            ...make sure to make strings related to the news like dont be general,be
            specificstrictly only the array of strings,in case there is not an year 
            mentioned in the input, do not include the year,do not add creative words
            add if necessary but make sure to be specific to the news and do not add
            any creative words or anything else,do not use creative words at all,
            do not add your own stories,keep it related to the news
            nothing more in case if the news article contains an year when the
            incident has happened then each string must contain the year at the end
            ONLY THE ARRAY NOTHING ELSE BEFORE OR AFTER THE ARRAY...dont say python
            or include template literals in front of the message`
      });
      const jsonString = response.text.replace(/```/g, '').trim();
      const stringArray = JSON.parse(jsonString);
      return stringArray;
}

async function genai2(arr,og){
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Compare each string in the array ${arr} to the user input ${og}. Only consider 
        strings that have the same core meaning as the input as "real news strings." Ignore unrelated 
        strings. Summarize the main facts by merging the information from all real news strings. 
        Calculate the percentage of accuracy as follows: (number of real news strings / total number
         of strings) × 100. If the percentage of real news strings is above 75%, set "verdict" to 
         "REAL"; otherwise, set it to "FAKE". Return your response in the following JSON format:
                {
        "summary": "[Write a concise summary of the main facts from the real news strings here
        always make sure that the real string is precisely and accurately correct to the given input
        dont change topic.]",
        "accuracy_percentage": [calculated percentage],
        "verdict": "[REAL or FAKE]"
        Examples:

If input is "Death of prime minister Narendra Modi" and 8 out of 10 strings confirm this event, summarize the main facts, set "accuracy_percentage" to 80, and "verdict" to "REAL".

If only 5 out of 10 strings are related, summarize those, set "accuracy_percentage" to 50, and "verdict" to "FAKE".

Only output the JSON object as shown above.
        }
 `
      });
      const text = response.candidates[0].content.parts[0].text;
      console.log(text);
      return text;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.post('/text_input', (req, res) => {
    res.sendFile(path.join(__dirname, 'text_input.html'));
});

app.post('/audio_input', (req, res) => {
    res.sendFile(path.join(__dirname, 'audio_input.html'));
});

app.post('/video_input', (req, res) => {
    res.sendFile(path.join(__dirname, 'video_input.html'));
});


app.post('/arraymaker', async(req, res) => {
    const text = req.body.texti;
    const year = req.body.yr;
    const ans = await genai1(text, year);
    lastGeneratedArray = ans;
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>News Ninjas - Analysis Results</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #1c1c1c;
                    color: #f5f5f5;
                    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23383838' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
                }
                .header {
                    background-color: #e60012;
                    color: white;
                    padding: 1rem;
                    text-align: center;
                    position: relative;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    border-bottom: 4px solid #000;
                }
                .header:after {
                    content: '';
                    position: absolute;
                    bottom: -10px;
                    left: 0;
                    width: 100%;
                    height: 6px;
                    background-color: #333;
                }
                .container {
                    max-width: 800px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background-color: #2d2d2d;
                    border-radius: 8px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                    border-left: 4px solid #e60012;
                    border-right: 4px solid #e60012;
                    position: relative;
                }
                .container:before {
                    content: '';
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                    border: 1px solid #444;
                    pointer-events: none;
                }
                .logo {
                    font-size: 2.5rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                    text-shadow: 3px 3px 0px #000;
                    letter-spacing: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .logo svg {
                    width: 40px;
                    height: 40px;
                }
                .tagline {
                    font-size: 1.2rem;
                    margin-bottom: 1rem;
                    font-style: italic;
                    letter-spacing: 1px;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 2rem;
                    color: #e60012;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                h1 svg {
                    width: 24px;
                    height: 24px;
                }
                .center-list {
                    list-style-type: none;
                    padding: 0;
                    margin: 2rem 0;
                }
                .lime {
                    background-color: #1a1a1a;
                    margin-bottom: 10px;
                    padding: 15px;
                    border-radius: 4px;
                    position: relative;
                    border-left: 3px solid #e60012;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                .lime:before {
                    content: '⚔️';
                    margin-right: 10px;
                }
                .lime:hover {
                    background-color: #252525;
                    transform: translateX(5px);
                }
                .lime.selected {
                    background-color: #333;
                    border-left: 3px solid #00e676;
                    box-shadow: 0 0 8px rgba(0,230,118,0.3);
                }
                .lime.selected:before {
                    content: '✓';
                    color: #00e676;
                }
                .btn {
                    background-color: #333;
                    color: white;
                    border: 2px solid #e60012;
                    padding: 1rem 2rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.3s ease;
                    width: 200px;
                    margin: 2rem auto 0;
                    position: relative;
                    overflow: hidden;
                }
                .btn:before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: all 0.5s ease;
                }
                .btn:hover:before {
                    left: 100%;
                }
                .btn:hover {
                    background-color: #e60012;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(230,0,18,0.4);
                }
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background-color: #555;
                    transform: none;
                    box-shadow: none;
                }
                .shuriken {
                    position: absolute;
                    opacity: 0.1;
                }
                .shuriken-1 {
                    top: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    transform: rotate(20deg);
                }
                .shuriken-2 {
                    bottom: 30px;
                    left: 30px;
                    width: 50px;
                    height: 50px;
                    transform: rotate(-15deg);
                }
                .selection-hint {
                    text-align: center;
                    color: #aaa;
                    font-style: italic;
                    margin-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">
                    <!-- Ninja Mask Icon -->
                    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M432 96c26.5 0 48-21.5 48-48S458.5 0 432 0s-48 21.5-48 48 21.5 48 48 48zm-48 128c0-53-43-96-96-96s-96 43-96 96 43 96 96 96 96-43 96-96zM144 328c0-39.8-32.2-72-72-72S0 288.2 0 328s32.2 72 72 72 72-32.2 72-72zm0-144c0-22.1-17.9-40-40-40s-40 17.9-40 40 17.9 40 40 40 40-17.9 40-40zm256 0c0-22.1-17.9-40-40-40s-40 17.9-40 40 17.9 40 40 40 40-17.9 40-40zm-72 332h-96c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h96c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM112 416c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm0-64c-53 0-96 43-96 96s43 96 96 96 96-43 96-96-43-96-96-96z"/>
                    </svg>
                    News Ninjas
                </div>
                <div class="tagline">Slicing Through Misinformation</div>
            </div>

            <div class="container">
                <!-- Shuriken Background Elements -->
                <svg class="shuriken shuriken-1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M478.21 334.093L336 256l142.21-78.093c11.795-6.477 15.961-21.384 9.232-33.037l-19.48-33.741c-6.728-11.653-21.72-15.499-33.227-8.523L296 186.718l3.475-162.204C299.763 11.061 288.937 0 275.48 0h-38.96c-13.456 0-24.283 11.061-23.994 24.514L216 186.718 77.265 102.607c-11.506-6.976-26.499-3.13-33.227 8.523l-19.48 33.741c-6.728 11.653-2.562 26.56 9.233 33.037L176 256 33.79 334.093c-11.795 6.477-15.961 21.384-9.232 33.037l19.48 33.741c6.728 11.653 21.721 15.499 33.227 8.523L216 325.282l-3.475 162.204C212.237 500.939 223.064 512 236.52 512h38.961c13.456 0 24.283-11.061 23.995-24.514L296 325.282l138.735 84.111c11.506 6.976 26.499 3.13 33.227-8.523l19.48-33.741c6.728-11.653 2.563-26.559-9.232-33.036z"/>
                </svg>
                <svg class="shuriken shuriken-2" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M478.21 334.093L336 256l142.21-78.093c11.795-6.477 15.961-21.384 9.232-33.037l-19.48-33.741c-6.728-11.653-21.72-15.499-33.227-8.523L296 186.718l3.475-162.204C299.763 11.061 288.937 0 275.48 0h-38.96c-13.456 0-24.283 11.061-23.994 24.514L216 186.718 77.265 102.607c-11.506-6.976-26.499-3.13-33.227 8.523l-19.48 33.741c-6.728 11.653-2.562 26.56 9.233 33.037L176 256 33.79 334.093c-11.795 6.477-15.961 21.384-9.232 33.037l19.48 33.741c6.728 11.653 21.721 15.499 33.227 8.523L216 325.282l-3.475 162.204C212.237 500.939 223.064 512 236.52 512h38.961c13.456 0 24.283-11.061 23.995-24.514L296 325.282l138.735 84.111c11.506 6.976 26.499 3.13 33.227-8.523l19.48-33.741c6.728-11.653 2.563-26.559-9.232-33.036z"/>
                </svg>

                <h1>
                    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/>
                    </svg>
                    Generated Headline Possibilities
                    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/>
                    </svg>
                </h1>

                <div class="selection-hint">Click on a headline to select it</div>

                <ul class="center-list">
                    ${ans.map((item, index) => `<li class="lime" data-value="${encodeURIComponent(item)}">${item}</li>`).join('')}
                </ul>

                <form action="/newsseeker" method="POST" id="headlineForm">
                    <input type="hidden" name="selectedHeadline" id="selectedHeadline" value="">
                    <button type="submit" class="btn" id="nextButton" disabled>
                        <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/>
                        </svg>
                        Next Page
                    </button>
                </form>
            </div>

            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const headlineItems = document.querySelectorAll('.lime');
                    const selectedHeadlineInput = document.getElementById('selectedHeadline');
                    const nextButton = document.getElementById('nextButton');
                    
                    headlineItems.forEach(item => {
                        item.addEventListener('click', function() {
                            // Remove selected class from all items
                            headlineItems.forEach(li => li.classList.remove('selected'));
                            
                            // Add selected class to clicked item
                            this.classList.add('selected');
                            
                            // Update hidden input value with selected headline
                            selectedHeadlineInput.value = this.getAttribute('data-value');
                            
                            // Enable the next button
                            nextButton.disabled = false;
                        });
                    });
                });
            </script>
        </body>
        </html>
    `;
    res.send(html);
});

app.post('/newsseeker', async (req, res) => {
    const selectedHeadline = req.body.selectedHeadline;
    const decodedHeadline = decodeURIComponent(selectedHeadline);
    og = decodedHeadline; 
    const params = {
        api_key: SD_API_KEY,
        query: decodedHeadline,
        results: 100,
        country: 'us',
        page: 0,
    };
    snippetsArray = [];
    try {
        const response = await axios.get(url, { params: params });
        if (response.status === 200) {
            const newsResults = response.data.news_results;
            const articles = newsResults.map(item => ({
                snippet: item.snippet,
                source: item.url, 
            }));
            for (let g = 0; g < articles.length; g++) {
                snippetsArray.push(articles[g].snippet);
            }
            // Await the verdict from genai2
            const ans_json = await genai2(snippetsArray, og);
            let verdictObj;
            try {
                // Try to extract JSON object from the string
                const match = ans_json.match(/\{[\s\S]*\}/);
                if (match) {
                    verdictObj = JSON.parse(match[0]);
                } else {
                    verdictObj = { summary: "Could not parse verdict.", accuracy_percentage: "N/A", verdict: "N/A" };
                }
            } catch (e) {
                verdictObj = { summary: "Could not parse verdict.", accuracy_percentage: "N/A", verdict: "N/A" };
            }
            // Verdict HTML
            const verdictColor = verdictObj.verdict === "REAL" ? "#00e676" : "#e60012";
            const verdictHTML = `
                <div style="background:#222;padding:1rem 2rem;border-radius:8px;margin-bottom:1.5rem;border-left:4px solid ${verdictColor};box-shadow:0 2px 8px ${verdictColor}33;text-align:center;">
                    <div style="font-size:1.4rem;font-weight:bold;color:${verdictColor};letter-spacing:1px;">
                        Verdict: ${verdictObj.verdict}
                    </div>
                </div>
            `;

            let htmlResponse = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>News Results for ${decodedHeadline}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #1c1c1c;
                        color: #f5f5f5;
                        background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23383838' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 2rem;
                    }
                    .intro {
                        background-color: #2d2d2d;
                        border-radius: 8px;
                        padding: 2rem;
                        margin-bottom: 2rem;
                        box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                        text-align: center;
                        border-left: 4px solid #e60012;
                        border-right: 4px solid #e60012;
                        position: relative;
                    }
                    .intro:before {
                        content: '';
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        right: 10px;
                        bottom: 10px;
                        border: 1px solid #444;
                        pointer-events: none;
                    }
                    .ninja-section-title {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        font-size: 2rem;
                        margin-bottom: 1rem;
                    }
                    .ninja-section-title svg {
                        width: 30px;
                        height: 30px;
                    }
                    .tagline {
                        font-size: 1.2rem;
                        margin-bottom: 2rem;
                        font-style: italic;
                        letter-spacing: 1px;
                    }
                    .shuriken {
                        position: absolute;
                        opacity: 0.15;
                    }
                    .shuriken-1 {
                        top: 20px;
                        right: 20px;
                        width: 80px;
                        height: 80px;
                        transform: rotate(20deg);
                    }
                    .shuriken-2 {
                        bottom: 30px;
                        left: 30px;
                        width: 60px;
                        height: 60px;
                        transform: rotate(-15deg);
                    }
                    .news-articles {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 20px;
                    }
                    .article-card {
                        background-color: #2d2d2d;
                        border-radius: 8px;
                        padding: 1.5rem;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        border-left: 4px solid #e60012;
                        border-right: 4px solid #e60012;
                        display: flex;
                        flex-direction: column;
                    }
                    .article-index {
                        font-size: 1rem;
                        color: #e60012;
                        margin-bottom: 0.5rem;
                        font-weight: bold;
                    }
                    .article-snippet {
                        flex-grow: 1;
                        margin-bottom: 1rem;
                        line-height: 1.6;
                    }
                    .btn {
                        background-color: #333;
                        color: white;
                        border: 2px solid #e60012;
                        padding: 0.8rem 1.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1rem;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        transition: all 0.3s ease;
                        text-decoration: none;
                        position: relative;
                        overflow: hidden;
                    }
                    .btn:before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }
                    .btn:hover:before {
                        left: 100%;
                    }
                    .btn:hover {
                        background-color: #e60012;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(230,0,18,0.4);
                    }
                    .btn svg {
                        width: 20px;
                        height: 20px;
                    }
                    @media (max-width: 768px) {
                        .news-articles {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="intro">
                        <h2 class="ninja-section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                            </svg>
                            News Results for "${decodedHeadline}"
                        </h2>
                        ${verdictHTML}
                        <p class="tagline">Found ${articles.length} articles matching your search</p>
                        <div class="shuriken shuriken-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2L9.1,8.1L3,9L7.5,13.4L6.5,19.5L12,16.5L17.5,19.5L16.5,13.4L21,9L14.9,8.1L12,2Z" />
                            </svg>
                        </div>
                        <div class="shuriken shuriken-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2L9.1,8.1L3,9L7.5,13.4L6.5,19.5L12,16.5L17.5,19.5L16.5,13.4L21,9L14.9,8.1L12,2Z" />
                            </svg>
                        </div>
                    </div>
                    <div class="news-articles">`;

            articles.forEach((article, index) => {
                htmlResponse += `
                    <div class="article-card">
                        <div class="article-index">Article ${index + 1}</div>
                        <div class="article-snippet">${article.snippet}</div>
                        <a href="${article.source}" target="_blank" class="btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            Read Full Article
                        </a>
                    </div>`;
            });

            htmlResponse += `
                    </div>
                    <div style="text-align: center; margin-top: 2rem;">
                        <a href="/" class="btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 12H5M12 19l-7-7 7-7"></path>
                            </svg>
                            Back to Search
                        </a>
                    </div>
                </div>
            </body>
            </html>`;

            res.setHeader('Content-Type', 'text/html');
            res.send(htmlResponse);
        }
    } catch (error) {
        console.error(error);

        const errorHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #1c1c1c;
                    color: #f5f5f5;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .error-card {
                    background-color: #2d2d2d;
                    border-radius: 8px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                    text-align: center;
                    border-left: 4px solid #e60012;
                    border-right: 4px solid #e60012;
                }
                .btn {
                    background-color: #333;
                    color: white;
                    border: 2px solid #e60012;
                    padding: 0.8rem 1.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s ease;
                    text-decoration: none;
                }
                .btn:hover {
                    background-color: #e60012;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-card">
                    <h2>Error</h2>
                    <p>An error occurred while fetching news.</p>
                    <a href="/" class="btn">Back to Search</a>
                </div>
            </div>
        </body>
        </html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(errorHTML);
    }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}
     link : http://localhost:${process.env.PORT || 3000}`);
});