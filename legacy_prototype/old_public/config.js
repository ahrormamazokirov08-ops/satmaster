// ==========================================
// Romantic Questionnaire - Frontend Configuration
// ==========================================
window.QUIZ_CONFIG = {
  // Replace with the link you want your partner to visit after finishing the quiz!
  // E.g., a photo album, private video, playlist, romantic letter, or personal Telegram chat link.
  // Example: "https://t.me/your_username" or "https://photos.app.goo.gl/your_album"
  FINAL_REDIRECT_URL: "[INSERT YOUR LINK HERE]",

  // Time in milliseconds to show the celebration screen before auto-redirecting (0 to disable auto-redirect and only show button)
  REDIRECT_DELAY_MS: 3800,

  // Enable subtle romantic harp chimes on button taps (uses Web Audio API synthesizer)
  ENABLE_SOUND: true,

  // Fallback endpoint in case host is different
  API_ENDPOINT: "/api/submit"
};
