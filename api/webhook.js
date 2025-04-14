const foloPayload = {
  guid: tweet.id_str,
  publishedAt: tweet.tweet_created_at,
  title: tweet.full_text || tweet.text || 'New Tweet',
  content: tweet.full_text || tweet.text || '',
  author: tweet.user?.name || 'Unknown'
};

console.log('准备发送到Folo的数据:', JSON.stringify(foloPayload, null, 2));

// 发送到Folo
const foloResponse = await fetch('https://api.follow.is/inboxes/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Follow-Secret': process.env.FOLO_SECRET,
    'X-Follow-Handle': process.env.FOLO_HANDLE
  },
  body: JSON.stringify(foloPayload)
});
