const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受POST请求' });
  }

  try {
    const webhookData = req.body;
    console.log('收到webhook数据:', JSON.stringify(webhookData, null, 2));

    // 验证webhook数据格式
    if (!webhookData.event || !webhookData.data) {
      return res.status(400).json({ error: '无效的webhook数据格式' });
    }

    // 根据不同的事件类型处理数据
    let foloPayload;
    switch (webhookData.event) {
      case 'new_tweet':
        const tweet = webhookData.data;
        foloPayload = {
          guid: tweet.id_str,
          publishedAt: tweet.tweet_created_at,  // 注意这里使用tweet_created_at
          title: `Tweet from ${tweet.user.name}`,
          content: tweet.full_text || tweet.text,  // 优先使用full_text
          author: tweet.user.name,
          authorUrl: `https://twitter.com/${tweet.user.screen_name}`,
          authorAvatar: tweet.user.profile_image_url_https,
          url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
          // 处理媒体内容
          media: tweet.extended_entities?.media ? 
            tweet.extended_entities.media.map(m => ({
              url: m.media_url_https,
              type: m.type === 'photo' ? 'photo' : 'video',
              preview_image_url: m.type === 'video' ? m.media_url_https : undefined
            })) : null
        };
        break;

      case 'profile_update':
        const profile = webhookData.data;
        foloPayload = {
          guid: `profile_${profile.id_str}_${Date.now()}`,
          publishedAt: new Date().toISOString(),
          title: `Profile Update: ${profile.name}`,
          content: `Profile changes:\n${JSON.stringify(profile.changes, null, 2)}`,
          author: profile.name,
          authorUrl: `https://twitter.com/${profile.screen_name}`,
          authorAvatar: profile.profile_image_url_https
        };
        break;

      case 'new_following':
        const user = webhookData.data;
        foloPayload = {
          guid: `following_${user.id_str}_${Date.now()}`,
          publishedAt: new Date().toISOString(),
          title: `New Following: ${user.name}`,
          content: user.description || '',
          author: user.name,
          authorUrl: `https://twitter.com/${user.screen_name}`,
          authorAvatar: user.profile_image_url_https
        };
        break;

      default:
        console.log('未知的事件类型:', webhookData.event);
        return res.status(400).json({ error: '不支持的事件类型' });
    }

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

    if (!foloResponse.ok) {
      throw new Error(`Folo API错误: ${foloResponse.status}`);
    }

    // 返回成功状态
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('处理错误:', error);
    res.status(500).json({ error: error.message });
  }
};
