import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {WebView} from 'react-native-webview';
import {API_IP_ADDRESS} from '../../../config';
import tw from 'twrnc';

interface Template {
  template_id: number;
  html_files: string;
}

interface TemplateSelectionScreenProps {
  route?: {
    params?: {
      onSelectTemplate?: (templateId: number) => void;
      onSaveTemplate?: () => void;
    };
  };
  onSelectTemplate?: (templateId: number) => void;
  onSaveTemplate?: () => void;
}

const TemplateSelectionScreen = (props: TemplateSelectionScreenProps) => {
  const onSelectTemplate =
    props.route?.params?.onSelectTemplate ||
    props.onSelectTemplate ||
    (id => console.log('Template selected:', id));
  const onSaveTemplate =
    props.route?.params?.onSaveTemplate ||
    props.onSaveTemplate ||
    (() => console.log('Save template'));

  const navigation = useNavigation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(
    null,
  );
  const [templateErrors, setTemplateErrors] = useState<Record<number, boolean>>(
    {},
  );

  const {width} = Dimensions.get('window');
  const isLargeScreen = width > 768;

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_IP_ADDRESS}/api/get-templates`);
        const data = await response.json();
        setTemplates(data.templates);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handlePreviewClick = (templateId: number) => {
    setSelectedTemplateId(templateId);
    onSelectTemplate(templateId);
    setPreviewTemplateId(templateId);
    setPreviewVisible(true);
  };

  const saveTemplate = async () => {
    if (!selectedTemplateId) return;

    setSaving(true);
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId)
        throw new Error('Customer ID not found. Please login again.');

      const response = await fetch(`${API_IP_ADDRESS}/api/save-template`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          custId: customerId,
          templateId: selectedTemplateId,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Invalid response from server.');
      }

      if (contentType?.includes('application/json')) {
        const result = await response.json();
        if (
          result.success ||
          result.message?.toLowerCase().includes('success')
        ) {
          onSaveTemplate();
          Alert.alert('Success', 'Template saved successfully!', [
            {text: 'OK', onPress: () => navigation.goBack()},
          ]);
        } else {
          Alert.alert('Error', result.message || 'Failed to save template');
        }
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Unexpected server response.');
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save template. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => saveTemplate();
  const closePreview = () => setPreviewVisible(false);
  const handleCancel = () => navigation.goBack();
  const handleTemplateError = (templateId: number) => {
    setTemplateErrors(prev => ({...prev, [templateId]: true}));
  };

  interface TemplatePreviewProps {
    uri: string;
    style?: object;
  }

  const TemplatePreview = ({uri, style = {}}: TemplatePreviewProps) => (
    <View style={[{flex: 1, overflow: 'hidden'}, style]}>
      <WebView
        source={{uri}}
        style={{flex: 1}}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onError={() => console.log('WebView error')}
      />
    </View>
  );

  interface TemplateGridItemProps {
    template: Template;
  }

  const TemplateGridItem = ({template}: TemplateGridItemProps) => {
    const fullHtmlUrl = `${template.html_files}/index.html`;
    const isSelected = selectedTemplateId === template.template_id;
    const hasError = templateErrors[template.template_id];

    return (
      <TouchableOpacity
        key={template.template_id}
        style={[
          tw.style(`${isLargeScreen ? 'w-1/3 p-2' : 'w-full mb-4'} rounded-md`,
          {
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          }),
        ]}
        onPress={() => handlePreviewClick(template.template_id)}>
        <View
          style={tw.style(`p-3 rounded-md ${isSelected ? 'bg-blue-500' : 'bg-white'}`)}>
          <View
            style={tw.style(`bg-gray-100 rounded-lg p-2 mb-2 h-36 overflow-hidden`)}>
            {hasError ? (
              <View style={tw`flex-1 items-center justify-center`}>
                <Text style={tw`text-gray-500`}>Template Preview</Text>
              </View>
            ) : (
              <TemplatePreview uri={fullHtmlUrl} />
            )}
          </View>
          <Text
            style={tw.style(`text-center text-sm ${
              isSelected ? 'text-white' : 'text-gray-500'
            }`)}>
            ID: {template.template_id}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (previewVisible && previewTemplateId !== null) {
    const selectedTemplate = templates.find(
      t => t.template_id === previewTemplateId,
    );
    const previewUrl = selectedTemplate
      ? `${selectedTemplate.html_files}/index.html`
      : '';

    return (
      <SafeAreaView style={tw.style(`flex-1 bg-white`)}>
        <View
          style={tw.style(`flex-row justify-between items-center p-4 border-b border-gray-200`)}>
          <Text style={tw.style(`text-xl font-bold`)}>
            Template Preview: {previewTemplateId}
          </Text>
          <TouchableOpacity onPress={closePreview}>
            <Text style={tw.style(`text-blue-500 font-medium`)}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={tw.style(`flex-1 bg-gray-100 m-4 rounded-lg overflow-hidden`)}>
          <TemplatePreview uri={previewUrl} />
        </View>

        <View style={tw.style(`flex-row justify-between px-4 pb-4`)}>
          <TouchableOpacity
            style={tw.style(`px-4 py-2 rounded-md bg-gray-200`)}
            onPress={closePreview}>
            <Text style={tw.style(`text-center font-medium`)}>Back to Selection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw.style(`px-4 py-2 rounded-md bg-blue-500`)}
            onPress={handleSubmit}
            disabled={saving}>
            {saving ? (
              <View style={tw.style(`flex-row justify-center items-center px-2`)}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={tw.style(`text-white font-medium ml-2`)}>Saving...</Text>
              </View>
            ) : (
              <Text style={tw.style(`text-white font-medium`)}>Save This Template</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw.style(`flex-1 bg-white`)}>
      <View
        style={tw.style(`flex-row justify-between items-center p-4 border-b border-gray-200`)}>
        <Text style={tw.style(`text-xl font-bold`)}>Select Template</Text>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={tw.style(`text-blue-500 font-medium`)}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={tw.style(`flex-1 p-4`)}>
        <View style={tw.style(`border border-gray-200 p-4 rounded-md`)}>
          {loading ? (
            <View style={tw.style(`items-center justify-center py-8`)}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={tw.style(`mt-2 text-gray-600`)}>Loading templates...</Text>
            </View>
          ) : (
            <View
              style={tw.style(`flex-row flex-wrap ${
                isLargeScreen ? 'justify-start' : 'justify-between'
              }`)}>
              {templates.map(template => (
                <TemplateGridItem
                  key={template.template_id}
                  template={template}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={tw.style(`mx-4 mb-4 p-3 rounded-md ${
          selectedTemplateId ? 'bg-blue-500' : 'bg-gray-300'
        }`)}
        onPress={handleSubmit}
        disabled={!selectedTemplateId || saving}>
        {saving ? (
          <View style={tw.style(`flex-row justify-center items-center`)}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={tw.style(`text-white font-medium ml-2`)}>Saving...</Text>
          </View>
        ) : (
          <Text style={tw.style(`text-white font-medium text-center`)}>
            Save Selected Template
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default TemplateSelectionScreen;
