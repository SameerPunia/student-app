
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { commonStyles, colors, spacing, borderRadius, typography, shadows } from '../styles/commonStyles';
import Icon from './Icon';
import * as WebBrowser from 'expo-web-browser';

interface Attachment {
  id?: string;
  type: 'image' | 'pdf' | 'document' | 'video' | 'audio' | 'drawing' | 'table';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  data?: any;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export default function AttachmentPreview({ attachments, onRemove, editable = false }: AttachmentPreviewProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string, mimeType?: string) => {
    if (type === 'image') return 'image';
    if (type === 'pdf' || mimeType?.includes('pdf')) return 'document-text';
    if (type === 'video') return 'videocam';
    if (type === 'audio') return 'musical-notes';
    if (type === 'drawing') return 'brush';
    if (type === 'table') return 'grid';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'document';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'grid';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'easel';
    return 'attach';
  };

  const getFileColor = (type: string, mimeType?: string) => {
    if (type === 'image') return '#34C759';
    if (type === 'pdf' || mimeType?.includes('pdf')) return '#FF3B30';
    if (type === 'video') return '#5856D6';
    if (type === 'audio') return '#FF9500';
    if (type === 'drawing') return '#FF2D55';
    if (type === 'table') return '#007AFF';
    if (mimeType?.includes('word')) return '#007AFF';
    if (mimeType?.includes('excel')) return '#34C759';
    if (mimeType?.includes('powerpoint')) return '#FF9500';
    return colors.textSecondary;
  };

  const openAttachment = async (attachment: Attachment) => {
    if (attachment.type === 'image') {
      setSelectedAttachment(attachment);
    } else if (attachment.type === 'drawing' || attachment.type === 'table') {
      // Show preview for drawings and tables
      setSelectedAttachment(attachment);
    } else {
      // Open in browser for PDFs and documents
      try {
        await WebBrowser.openBrowserAsync(attachment.url);
      } catch (error) {
        console.error('Error opening attachment:', error);
      }
    }
  };

  const renderAttachmentCard = (attachment: Attachment, index: number) => {
    const fileColor = getFileColor(attachment.type, attachment.mimeType);
    const fileIcon = getFileIcon(attachment.type, attachment.mimeType);

    if (attachment.type === 'image') {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => openAttachment(attachment)}
          style={{
            marginBottom: spacing.md,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            ...shadows.sm,
          }}
        >
          <Image
            source={{ uri: attachment.url }}
            style={{
              width: '100%',
              height: 200,
              backgroundColor: colors.border,
            }}
            resizeMode="cover"
            onError={(error) => {
              console.error('Image load error:', error);
            }}
          />
          <View style={{
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={[commonStyles.body, { marginBottom: spacing.xs }]} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Text style={commonStyles.caption}>
                {formatFileSize(attachment.size)}
              </Text>
            </View>
            {editable && onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(index)}
                style={{
                  padding: spacing.sm,
                  marginLeft: spacing.sm,
                }}
              >
                <Icon name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Document/PDF/Drawing/Table card
    return (
      <TouchableOpacity
        key={index}
        onPress={() => openAttachment(attachment)}
        style={{
          marginBottom: spacing.md,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surface,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          ...shadows.sm,
        }}
      >
        <View style={{
          width: 50,
          height: 50,
          borderRadius: borderRadius.md,
          backgroundColor: fileColor + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={fileIcon} size={24} color={fileColor} />
        </View>
        
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[commonStyles.body, { marginBottom: spacing.xs }]} numberOfLines={1}>
            {attachment.name}
          </Text>
          <View style={[commonStyles.row, { gap: spacing.md }]}>
            <Text style={commonStyles.caption}>
              {formatFileSize(attachment.size)}
            </Text>
            <Text style={[commonStyles.caption, { color: fileColor }]}>
              {attachment.type.toUpperCase()}
            </Text>
          </View>
        </View>

        {editable && onRemove ? (
          <TouchableOpacity
            onPress={() => onRemove(index)}
            style={{
              padding: spacing.sm,
              marginLeft: spacing.sm,
            }}
          >
            <Icon name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderTablePreview = (tableData: any) => {
    if (!tableData || !tableData.data) return null;

    return (
      <ScrollView horizontal style={{ maxHeight: 400 }}>
        <View style={{ padding: spacing.lg }}>
          {tableData.headers && (
            <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              {tableData.headers.map((header: string, index: number) => (
                <View
                  key={index}
                  style={{
                    width: 120,
                    padding: spacing.sm,
                    backgroundColor: colors.primary + '20',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={[commonStyles.body, { fontWeight: typography.semibold }]}>
                    {header}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {tableData.data.map((row: any[], rowIndex: number) => (
            <View key={rowIndex} style={{ flexDirection: 'row' }}>
              {row.map((cell: any, colIndex: number) => (
                <View
                  key={colIndex}
                  style={{
                    width: 120,
                    padding: spacing.sm,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={commonStyles.bodySecondary}>
                    {typeof cell === 'string' ? cell : cell.value || ''}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View>
      {attachments.map((attachment, index) => renderAttachmentCard(attachment, index))}

      {/* Preview Modal */}
      <Modal
        visible={selectedAttachment !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedAttachment(null);
          setZoomScale(1);
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
        }}>
          <View style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 50 : 20,
            right: 20,
            zIndex: 10,
          }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedAttachment(null);
                setZoomScale(1);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            maximumZoomScale={3}
            minimumZoomScale={1}
            onScroll={(event) => {
              const { zoomScale } = event.nativeEvent;
              if (zoomScale) {
                setZoomScale(zoomScale);
              }
            }}
            scrollEventThrottle={16}
          >
            {selectedAttachment && (
              <>
                {selectedAttachment.type === 'image' && (
                  <>
                    <Image
                      source={{ uri: selectedAttachment.url }}
                      style={{
                        width: Dimensions.get('window').width,
                        height: Dimensions.get('window').height * 0.8,
                      }}
                      resizeMode="contain"
                      onLoadStart={() => setImageLoading(true)}
                      onLoadEnd={() => setImageLoading(false)}
                    />
                    {imageLoading && (
                      <ActivityIndicator
                        size="large"
                        color="white"
                        style={{ position: 'absolute' }}
                      />
                    )}
                  </>
                )}

                {selectedAttachment.type === 'table' && (
                  <View style={{ backgroundColor: colors.background, borderRadius: borderRadius.lg, overflow: 'hidden' }}>
                    {renderTablePreview(selectedAttachment.data)}
                  </View>
                )}

                {selectedAttachment.type === 'drawing' && (
                  <View style={{
                    backgroundColor: 'white',
                    borderRadius: borderRadius.lg,
                    padding: spacing.lg,
                  }}>
                    <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: spacing.lg }]}>
                      Drawing Preview
                    </Text>
                    <Text style={[commonStyles.caption, { textAlign: 'center' }]}>
                      Drawing preview not yet implemented
                    </Text>
                  </View>
                )}

                <View style={{
                  position: 'absolute',
                  bottom: 40,
                  left: 20,
                  right: 20,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                }}>
                  <Text style={[commonStyles.body, { color: 'white', marginBottom: spacing.xs }]}>
                    {selectedAttachment.name}
                  </Text>
                  <View style={[commonStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={[commonStyles.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                      {formatFileSize(selectedAttachment.size)}
                    </Text>
                    {selectedAttachment.type === 'image' && zoomScale > 1 && (
                      <Text style={[commonStyles.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                        Zoom: {zoomScale.toFixed(1)}x
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
