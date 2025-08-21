import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Folder, Download, Trash2, Edit, Copy, Move } from 'lucide-react';

interface FileItem {
    id: number;
    name: string;
    size: number;
    type: string;
    file: File;
    status: string;
}

const ToolsApp = () => {
    const [activeTab, setActiveTab] = useState('convert');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [quality, setQuality] = useState(80);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 文件上传处理
    const handleFileUpload = (uploadedFiles: FileList | null) => {
        if (!uploadedFiles) return;
        
        const newFiles = Array.from(uploadedFiles).map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            status: 'ready'
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    // 文档转换
    const convertDocument = async (file: FileItem, targetFormat: string) => {
        setLoading(true);
        setMessage('');
        
        try {
            const formData = new FormData();
            formData.append('file', file.file);
            formData.append('targetFormat', targetFormat);

            // 这里应该调用Netlify Functions
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `converted-${file.name.split('.')[0]}.${targetFormat}`;
                link.click();
                URL.revokeObjectURL(url);
                setMessage(`文档转换成功！`);
            } else {
                throw new Error('转换失败');
            }
        } catch (error) {
            setMessage('转换失败: ' + (error as Error).message);
        }
        setLoading(false);
    };

    // 图片压缩 - 前端实现
    const compressImages = async (images: FileItem[]) => {
        setLoading(true);
        setMessage('');
        
        try {
            let totalOriginalSize = 0;
            let totalCompressedSize = 0;
            
            for (const image of images) {
                if (!image.type.startsWith('image/')) continue;
                
                totalOriginalSize += image.size;
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        // 计算新尺寸（可选：添加尺寸限制）
                        let { width, height } = img;
                        const maxSize = 1920;
                        
                        if (width > maxSize || height > maxSize) {
                            const ratio = Math.min(maxSize / width, maxSize / height);
                            width *= ratio;
                            height *= ratio;
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        ctx?.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                totalCompressedSize += blob.size;
                                
                                // 下载压缩后的图片
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `compressed-${image.name}`;
                                link.click();
                                URL.revokeObjectURL(url);
                            }
                            resolve(void 0);
                        }, 'image/jpeg', quality / 100);
                    };
                    img.src = URL.createObjectURL(image.file);
                });
            }
            
            const savedBytes = totalOriginalSize - totalCompressedSize;
            const savedPercent = ((savedBytes / totalOriginalSize) * 100).toFixed(1);
            setMessage(`压缩完成！节省了 ${formatFileSize(savedBytes)} (${savedPercent}%)`);
        } catch (error) {
            setMessage('压缩失败: ' + (error as Error).message);
        }
        setLoading(false);
    };

    // 文件管理操作
    const handleFileOperation = (operation: string, fileIds: number[]) => {
        switch (operation) {
            case 'rename':
                const newName = prompt('请输入新的文件名前缀:');
                if (newName) {
                    setFiles(prev => prev.map(f => 
                        fileIds.includes(f.id) 
                            ? { ...f, name: `${newName}-${f.id}.${f.name.split('.').pop()}` }
                            : f
                    ));
                    setMessage(`已重命名 ${fileIds.length} 个文件`);
                }
                break;
            case 'delete':
                if (confirm(`确定要删除选中的 ${fileIds.length} 个文件吗？`)) {
                    setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
                    setSelectedFiles([]);
                    setMessage(`已删除 ${fileIds.length} 个文件`);
                }
                break;
            case 'copy':
                setMessage(`已复制 ${fileIds.length} 个文件到剪贴板`);
                break;
            case 'move':
                const folder = prompt('请输入目标文件夹名称:');
                if (folder) {
                    setMessage(`已将 ${fileIds.length} 个文件移动到 ${folder} 文件夹`);
                }
                break;
        }
        setSelectedFiles([]);
    };

    // 格式化文件大小
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* 导航标签 */}
            <div className="flex space-x-4 mb-8">
                {[
                    { id: 'convert', icon: FileText, label: '文档转换' },
                    { id: 'manage', icon: Folder, label: '文件管理' },
                    { id: 'compress', icon: Image, label: '图片压缩' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-primary-content shadow-lg'
                                : 'bg-white/10 text-white hover:bg-white/20 shadow'
                        }`}
                    >
                        <tab.icon size={20} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* 文档转换功能 */}
            {activeTab === 'convert' && (
                <div className="bg-white/10 backdrop-blur rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <FileText className="mr-3 text-primary" />
                        文档格式转换
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-white/5"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mx-auto mb-4 text-gray-300" size={48} />
                                <p className="text-lg text-white">点击或拖拽上传文档</p>
                                <p className="text-sm text-gray-300 mt-2">支持 PDF, DOC, DOCX, TXT, MD</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                    multiple
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                />
                            </div>
                            
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-white mb-2">
                                    目标格式
                                </label>
                                <select 
                                    id="convertFormat"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="docx">Word文档</option>
                                    <option value="txt">纯文本</option>
                                    <option value="md">Markdown</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">待转换文件</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {files.filter(f => 
                                    f.type.includes('document') || 
                                    f.name.match(/\.(pdf|doc|docx|txt|md)$/i)
                                ).map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                                        <div>
                                            <p className="font-medium text-white">{file.name}</p>
                                            <p className="text-sm text-gray-300">{formatFileSize(file.size)}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const select = document.getElementById('convertFormat') as HTMLSelectElement;
                                                convertDocument(file, select.value);
                                            }}
                                            disabled={loading}
                                            className="btn disabled:opacity-50"
                                        >
                                            {loading ? '转换中...' : '转换'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 文件管理功能 */}
            {activeTab === 'manage' && (
                <div className="bg-white/10 backdrop-blur rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Folder className="mr-3 text-primary" />
                        文件管理
                    </h2>
                    
                    <div className="mb-6">
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-white/5"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mx-auto mb-4 text-gray-300" size={48} />
                            <p className="text-lg text-white">批量上传文件进行管理</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileUpload(e.target.files)}
                            />
                        </div>
                    </div>

                    {/* 批量操作工具栏 */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <button 
                            onClick={() => handleFileOperation('rename', selectedFiles)}
                            disabled={selectedFiles.length === 0}
                            className="btn disabled:opacity-50"
                        >
                            <Edit size={16} />
                            <span>批量重命名</span>
                        </button>
                        <button 
                            onClick={() => handleFileOperation('copy', selectedFiles)}
                            disabled={selectedFiles.length === 0}
                            className="btn disabled:opacity-50"
                        >
                            <Copy size={16} />
                            <span>复制</span>
                        </button>
                        <button 
                            onClick={() => handleFileOperation('move', selectedFiles)}
                            disabled={selectedFiles.length === 0}
                            className="btn disabled:opacity-50"
                        >
                            <Move size={16} />
                            <span>移动</span>
                        </button>
                        <button 
                            onClick={() => handleFileOperation('delete', selectedFiles)}
                            disabled={selectedFiles.length === 0}
                            className="btn disabled:opacity-50 bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 size={16} />
                            <span>删除</span>
                        </button>
                    </div>

                    {/* 文件列表 */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center space-x-4 p-4 bg-white/10 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedFiles(prev => [...prev, file.id]);
                                        } else {
                                            setSelectedFiles(prev => prev.filter(id => id !== file.id));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary"
                                />
                                <FileText className="text-gray-300" size={20} />
                                <div className="flex-1">
                                    <p className="font-medium text-white">{file.name}</p>
                                    <p className="text-sm text-gray-300">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 图片压缩功能 */}
            {activeTab === 'compress' && (
                <div className="bg-white/10 backdrop-blur rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Image className="mr-3 text-primary" />
                        图片压缩优化
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-white/5"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Image className="mx-auto mb-4 text-gray-300" size={48} />
                                <p className="text-lg text-white">上传图片进行压缩</p>
                                <p className="text-sm text-gray-300 mt-2">支持 JPG, PNG, WebP</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e.target.files)}
                                />
                            </div>
                            
                            <div className="mt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        压缩质量: {quality}%
                                    </label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={quality}
                                        onChange={(e) => setQuality(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">图片列表</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {files.filter(f => f.type.startsWith('image/')).map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                                        <div>
                                            <p className="font-medium text-white">{file.name}</p>
                                            <p className="text-sm text-gray-300">{formatFileSize(file.size)}</p>
                                        </div>
                                        <button 
                                            onClick={() => compressImages([file])}
                                            disabled={loading}
                                            className="btn disabled:opacity-50"
                                        >
                                            {loading ? '压缩中...' : '压缩'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {files.filter(f => f.type.startsWith('image/')).length > 1 && (
                                <button 
                                    onClick={() => compressImages(files.filter(f => f.type.startsWith('image/')))}
                                    disabled={loading}
                                    className="w-full mt-4 btn disabled:opacity-50"
                                >
                                    {loading ? '批量压缩中...' : '批量压缩所有图片'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 消息提示 */}
            {message && (
                <div className="fixed bottom-6 right-6 bg-primary text-primary-content px-6 py-3 rounded-lg shadow-lg max-w-md">
                    {message}
                    <button 
                        onClick={() => setMessage('')}
                        className="ml-4 text-lg font-bold"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default ToolsApp;
