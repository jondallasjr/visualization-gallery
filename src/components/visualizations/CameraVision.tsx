// src/components/visualizations/CameraVision.tsx
"use client";

import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { OpenAI } from 'openai';

const CameraVision: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [descriptions, setDescriptions] = useState<{ text: string; font: string; left: string; top: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Ensure you have this in your .env file
    dangerouslyAllowBrowser: true, // Only for client-side usage
  });

  // List of fonts to choose from
  const fonts = [
    'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Comic Sans MS', 'Impact', 'Lucida Console', 'Palatino', 'Trebuchet MS'
  ];

  const captureAndDescribe = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsLoading(true);

    try {
      // Append the last 20 descriptions to the prompt
      const previousDescriptions = descriptions.map(d => d.text).join('\n');
      const prompt = `Describe what you see in this image in 1-5 words. Be poetic, cryptic, and intriguing. Do not repeat the previous descriptions. Focus on new objects, ideas, or concepts. If there is nothing new, respond with "Nothing new...":\n<Previous Descriptions>${previousDescriptions}\n</Previous Descriptions>`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: prompt 
              },
              {
                type: "image_url",
                image_url: {
                  url: imageSrc,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
      });

      const newDescription = response.choices[0].message.content || 'A moment suspended in time...';

      // Generate random font and position for the new description
      const font = fonts[Math.floor(Math.random() * fonts.length)];
      const left = `${Math.random() * 80 + 10}%`; // Random horizontal position
      const top = `${Math.random() * 80 + 10}%`; // Random vertical position

      setDescriptions((prev) => {
        const updatedDescriptions = [{ text: newDescription, font, left, top }, ...prev].slice(0, 20); // Keep only the last 20 descriptions
        return updatedDescriptions;
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      setDescriptions((prev) => [
        { text: 'A fleeting glimpse....', font: 'Arial', left: '50%', top: '50%' },
        ...prev,
      ].slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(captureAndDescribe, 1000); // Capture every second
    return () => clearInterval(interval);
  }, [descriptions]); // Add descriptions to dependency array to ensure the latest descriptions are used

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4 relative overflow-hidden">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
        className="rounded-lg shadow-lg"
      />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {descriptions.map((desc, index) => {
          const opacity = 1 - (index / 20); // Fade older descriptions
          const scale = 1 + (index * 0.05); // Scale older descriptions
          const rotate = (index % 2 === 0 ? 1 : -1) * (index * 2); // Rotate for a swirling effect
          const translateX = Math.sin(index) * 50; // Horizontal movement
          const translateY = Math.cos(index) * 50; // Vertical movement

          return (
            <div
              key={index}
              className="absolute text-white italic"
              style={{
                opacity,
                transform: `scale(${scale}) rotate(${rotate}deg) translate(${translateX}px, ${translateY}px)`,
                zIndex: 20 - index, // Stack older descriptions further back
                color: `hsl(${(index * 30) % 360}, 100%, 70%)`, // Psychedelic colors
                textShadow: '0 0 10px rgba(255, 255, 255, 0.8)', // Glow effect
                animation: `swirl ${5 + index * 0.5}s infinite alternate ease-in-out`, // Swirling animation
                fontFamily: desc.font, // Use the assigned font
                left: desc.left, // Use the assigned horizontal position
                top: desc.top, // Use the assigned vertical position
                fontSize: `${Math.random() * 2 + 1}rem`, // Random font size for new descriptions
              }}
            >
              {desc.text}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes swirl {
          0% {
            transform: scale(1) rotate(0deg) translate(0, 0);
          }
          100% {
            transform: scale(1.2) rotate(10deg) translate(20px, 20px);
          }
        }
      `}</style>
    </div>
  );
};

export default CameraVision;