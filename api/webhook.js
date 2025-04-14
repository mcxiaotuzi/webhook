module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受POST请求' });
  }

  try {
    const webhookData = req.body;
    console.log('收到webhook数据:', JSON.stringify(webhookData, null, 2));

    if (!webhookData.event || !webhookData.data) {
      return res.status(400).json({ error: '无效的webhook数据格式' });
    }

    // 根据不同的事件类型处理数据
    let foloPayload;
    switch (webhookData.event) {
      case 'new_tweet':
        const tweet = webhookData.data;
        // 确保所有必需字段都有值
        foloPayload = {
          guid: tweet.id_str || String(Date.now()),  // 确保有唯一标识
          publishedAt: tweet.tweet_created_at || new Date().toISOString(),
          title: tweet.full_text || tweet.text || 'New Tweet',  // 确保有标题
          content: tweet.full_text || tweet.text || '',  // 内容可以为空
          author: tweet.user?.name || 'Unknown',
          url: tweet.user ? 
            `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}` : 
            null,
          // 只在有媒体内容时添加media字段
          ...(tweet.extended_entities?.media ? {
            media: tweet.extended_entities.media.map(m => ({
              url: m.media_url_https,
              type: m.type === 'photo' ? 'photo' : 'video'
            }))
          } : {})
        };
        break;

      case 'profile_update':
        const profile = webhookData.data;
        foloPayload = {
          guid: `profile_${profile.id_str}_${Date.now()}`,
          publishedAt: new Date().toISOString(),
          title: `Profile Update: ${profile.name || 'Unknown'}`,
          content: profile.changes ? 
            `Profile changes:\n${JSON.stringify(profile.changes, null, 2)}` : 
            'Profile updated',
          author: profile.name || 'Unknown'
        };
        break;

      case 'new_following':
        const user = webhookData.data;
        foloPayload = {
          guid: `following_${user.id_str}_${Date.now()}`,
          publishedAt: new Date().toISOString(),
          title: `New Following: ${user.name || 'Unknown'}`,
          content: user.description || 'New following',
          author: user.name || 'Unknown'
        };
        break;

      default:
        console.log('未知的事件类型:', webhookData.event);
        return res.status(400).json({ error: '不支持的事件类型' });
    }

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

    if (!foloResponse.ok) {
      const errorText = await foloResponse.text();
      console.error('Folo响应错误:', errorText);
      throw new Error(`Folo API错误: ${foloResponse.status} - ${errorText}`);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('处理错误:', error);
    res.status(500).json({ error: error.message });
  }
};
