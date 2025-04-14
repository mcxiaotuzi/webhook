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

    // 构建最简单的Folo payload
    let foloPayload;
    if (webhookData.event === 'new_tweet') {
      const tweet = webhookData.data;
      foloPayload = {
        guid: tweet.id_str,
        publishedAt: tweet.tweet_created_at,
        title: tweet.full_text || tweet.text || 'New Tweet',
        content: tweet.full_text || tweet.text || '',
        author: tweet.user?.name || 'Unknown'
      };

      // 只有在有媒体内容时才添加media字段
      if (tweet.extended_entities?.media) {
        const media = tweet.extended_entities.media.map(m => ({
          url: m.media_url_https,
          type: m.type === 'photo' ? 'photo' : 'video'
        }));
        if (media.length > 0) {
          foloPayload.media = media;
        }
      }
    } else {
      // 对于其他类型的事件，使用最简单的格式
      foloPayload = {
        guid: `${webhookData.event}_${Date.now()}`,
        publishedAt: new Date().toISOString(),
        title: `New ${webhookData.event}`,
        content: JSON.stringify(webhookData.data, null, 2),
        author: webhookData.data.name || 'Unknown'
      };
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
