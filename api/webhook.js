export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('只接受POST请求', { status: 405 });
  }

  try {
    const tweet = await request.json();
    
    // 转发到Folo
    const response = await fetch('https://api.follow.is/inboxes/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Follow-Secret': process.env.FOLO_SECRET,
        'X-Follow-Handle': process.env.FOLO_HANDLE
      },
      body: JSON.stringify({
        guid: tweet.id_str,
        publishedAt: tweet.created_at,
        title: `Tweet from ${tweet.user.name}`,
        content: tweet.text,
        author: tweet.user.name,
        authorUrl: `https://twitter.com/${tweet.user.screen_name}`,
        authorAvatar: tweet.user.profile_image_url_https,
        url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
        media: tweet.extended_entities?.media ? 
          tweet.extended_entities.media.map(m => ({
            url: m.media_url_https,
            type: m.type === 'photo' ? 'photo' : 'video'
          })) : null
      })
    });

    return new Response('成功', { status: 200 });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
