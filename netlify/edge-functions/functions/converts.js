// netlify/functions/convert.js
const multipart = require('parse-multipart-data');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // 解析multipart数据
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);
        
        const file = parts.find(part => part.name === 'file');
        const targetFormat = parts.find(part => part.name === 'targetFormat')?.data.toString();

        if (!file || !targetFormat) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: '缺少文件或目标格式' })
            };
        }

        // 这里应该实现实际的文档转换逻辑
        // 由于Netlify Functions的限制，复杂的转换可能需要外部服务
        
        // 简化处理：返回原文件（实际应用中需要真正的转换）
        const fileName = `converted-${Date.now()}.${targetFormat}`;
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${fileName}"`
            },
            body: file.data.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('转换错误:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '转换失败: ' + error.message })
        };
    }
};
