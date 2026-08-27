import React, { useState, useEffect, useRef } from 'react'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  ScrollView, 
  StatusBar, 
  Alert, 
  FlatList, 
  Modal, 
  TextInput,
  Platform,
  Linking,
} from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Feather } from '@expo/vector-icons'; 
import * as ImagePicker from 'expo-image-picker'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme'; 
import { 
  getMonuments, 
  ApiMonument, 
  ApiHistorySection,
  ApiMonumentImage,
  uploadMonumentImage, 
  deleteMonumentImage, 
  updateMonumentDetails,
  createHistorySection,
  updateHistorySection,
  deleteHistorySection,
  uploadHistorySectionImage,
  deleteHistorySectionImage,
  generateAIMonumentDetails,
  discoverAIMonumentImages,
  uploadGalleryImage,
  updateGalleryImageMetadata,
  deleteGalleryImage,
  getImageUrl
} from '../services/monumentService'; 
import { PrimaryButton } from '../components/PrimaryButton'; 
 
export const AdminUploadScreen: React.FC<{ navigation: any }> = ({ navigation }) => { 
  const [monuments, setMonuments] = useState<ApiMonument[]>([]); 
  const [selectedMonument, setSelectedMonument] = useState<ApiMonument | null>(null); 
  const [imageUri, setImageUri] = useState<string | null>(null); 
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size?: string } | null>(null); 
  const [isPickerVisible, setIsPickerVisible] = useState(false); 
  const [currentImageError, setCurrentImageError] = useState(false);


   
  // Status states 
  const [isLoading, setIsLoading] = useState(false); 
  const [isUploading, setIsUploading] = useState(false); 
  const [successMessage, setSuccessMessage] = useState<string | null>(null); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  // Details editor states
  const [isDetailsCollapsibleOpen, setIsDetailsCollapsibleOpen] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<any>({
    fullHistory: '',
    architecture: '',
    culturalImportance: '',
    legends: '',
    restorationHistory: '',
    interestingFacts: '',
    visitingInformation: '',
    historicalTimeline: '[]',
    historicalEvents: '[]'
  });

  // History sections builder states
  const [isHistoryCollapsibleOpen, setIsHistoryCollapsibleOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [sectionEdits, setSectionEdits] = useState<{ [key: string]: { title: string; content: string; order: string } }>({});
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');
  const [newSectionOrder, setNewSectionOrder] = useState('0');

  // AI Details Generator States
  const [isAICollapsibleOpen, setIsAICollapsibleOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState<string>('');
  const [generatedDetails, setGeneratedDetails] = useState<any>(null);
  const [draftDetails, setDraftDetails] = useState<any>(null);
  const [activeAITab, setActiveAITab] = useState<'basic' | 'history' | 'architecture' | 'cultural' | 'legends' | 'timeline' | 'preservation' | 'heritage' | 'visitor' | 'educational'>('basic');
  const [aiStrategies, setAiStrategies] = useState<Record<string, 'keep' | 'replace' | 'merge'>>({
    basic: 'keep',
    history: 'keep',
    architecture: 'keep',
    cultural: 'keep',
    legends: 'keep',
    timeline: 'keep',
    preservation: 'keep',
    heritage: 'keep',
    visitor: 'keep',
    educational: 'keep'
  });

  // Discovered images state
  const [discoveredImages, setDiscoveredImages] = useState<ApiMonumentImage[]>([]);
  const [isDiscoveringImages, setIsDiscoveringImages] = useState(false);

  // Abort Controllers for AI generation & Discovery cancellation
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const imageAbortControllerRef = useRef<AbortController | null>(null);

  // Gallery Photographs States
  const [isGalleryCollapsibleOpen, setIsGalleryCollapsibleOpen] = useState(false);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<'historical' | 'modern' | 'architecture' | 'sculpture' | 'inscription' | 'restoration'>('historical');
  
  // Gallery add photo form states
  const [galleryImageUri, setGalleryImageUri] = useState<string | null>(null);
  const [galleryFileInfo, setGalleryFileInfo] = useState<{ name: string; type: string; size?: string } | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDescription, setGalleryDescription] = useState('');
  const [gallerySource, setGallerySource] = useState('');
  const [gallerySourceUrl, setGallerySourceUrl] = useState('');
  const [galleryPhotographer, setGalleryPhotographer] = useState('');
  const [galleryYear, setGalleryYear] = useState('');
  const [galleryCredit, setGalleryCredit] = useState('');
  const [galleryLicense, setGalleryLicense] = useState('');

  // Inline edit state for existing gallery photo
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageForm, setEditingImageForm] = useState<any>(null);
  const [editingImageUri, setEditingImageUri] = useState<string | null>(null);

  // Recognition Profile & Verified Reference Images States
  const [isRecCollapsibleOpen, setIsRecCollapsibleOpen] = useState(false);
  const [isSavingRec, setIsSavingRec] = useState(false);
  const [recProfileForm, setRecProfileForm] = useState<any>({
    distinctiveFeatures: '',
    architecturalIdentifiers: '',
    visualLandmarks: '',
    commonViewpoints: '',
    entranceDescription: '',
    gopuramDescription: '',
    vimanaDescription: '',
    mandapaDescription: '',
    sculptureIdentifiers: '',
    inscriptionIdentifiers: '',
    recognitionNotes: ''
  });
  // Sync recognitionProfile form state when selectedMonument changes
  useEffect(() => {
    if (selectedMonument) {
      const rp = selectedMonument.recognitionProfile || {};
      setRecProfileForm({
        distinctiveFeatures: (rp.distinctiveFeatures || []).join('\n'),
        architecturalIdentifiers: (rp.architecturalIdentifiers || []).join('\n'),
        visualLandmarks: (rp.visualLandmarks || []).join('\n'),
        commonViewpoints: (rp.commonViewpoints || []).join('\n'),
        entranceDescription: rp.entranceDescription || '',
        gopuramDescription: rp.gopuramDescription || '',
        vimanaDescription: rp.vimanaDescription || '',
        mandapaDescription: rp.mandapaDescription || '',
        sculptureIdentifiers: (rp.sculptureIdentifiers || []).join('\n'),
        inscriptionIdentifiers: (rp.inscriptionIdentifiers || []).join('\n'),
        recognitionNotes: rp.recognitionNotes || ''
      });
    }
  }, [selectedMonument]);

  const handleSaveRecProfile = async () => {
    if (!selectedMonument) return;
    setIsSavingRec(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const convertToList = (str: string) => 
        str.split('\n').map(s => s.trim()).filter(s => s.length > 0);

      const payload = {
        distinctiveFeatures: convertToList(recProfileForm.distinctiveFeatures),
        architecturalIdentifiers: convertToList(recProfileForm.architecturalIdentifiers),
        visualLandmarks: convertToList(recProfileForm.visualLandmarks),
        commonViewpoints: convertToList(recProfileForm.commonViewpoints),
        entranceDescription: recProfileForm.entranceDescription,
        gopuramDescription: recProfileForm.gopuramDescription,
        vimanaDescription: recProfileForm.vimanaDescription,
        mandapaDescription: recProfileForm.mandapaDescription,
        sculptureIdentifiers: convertToList(recProfileForm.sculptureIdentifiers),
        inscriptionIdentifiers: convertToList(recProfileForm.inscriptionIdentifiers),
        recognitionNotes: recProfileForm.recognitionNotes
      };

      const response = await updateMonumentDetails(selectedMonument._id, { recognitionProfile: payload }, activeUserId);

      if (response.success && response.data) {
        setSuccessMessage('Monument recognition profile updated successfully!');
        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to update recognition profile.');
      }
    } catch (err: any) {
      console.error('[SAVE REC PROFILE ERROR]', err);
      setErrorMessage(err.message || 'Failed to update recognition profile.');
    } finally {
      setIsSavingRec(false);
    }
  };



  // Abort any ongoing AI generation or discovery on unmount
  useEffect(() => {
    return () => {
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
      }
      if (imageAbortControllerRef.current) {
        imageAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Sync section edits when selectedMonument changes
  useEffect(() => {
    if (selectedMonument && selectedMonument.historySections) {
      const edits: any = {};
      selectedMonument.historySections.forEach((sec) => {
        edits[sec.id || ''] = {
          title: sec.title,
          content: sec.content,
          order: String(sec.order)
        };
      });
      setSectionEdits(edits);
    }
  }, [selectedMonument]);

  // Sync details form state when monument selection changes
  useEffect(() => {
    if (selectedMonument) {
      setDetailsForm({
        fullHistory: selectedMonument.fullHistory || '',
        architecture: selectedMonument.architecture || '',
        culturalImportance: selectedMonument.culturalImportance || '',
        legends: (selectedMonument.legends || []).join('\n'),
        restorationHistory: selectedMonument.restorationHistory || '',
        interestingFacts: (selectedMonument.interestingFacts || []).join('\n'),
        visitingInformation: selectedMonument.visitingInformation || '',
        historicalTimeline: JSON.stringify(selectedMonument.historicalTimeline || [], null, 2),
        historicalEvents: JSON.stringify(selectedMonument.historicalEvents || [], null, 2)
      });
    }
  }, [selectedMonument]);

  const handleSaveDetails = async () => {
    if (!selectedMonument) return;
    
    setIsSavingDetails(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }
      
      // Parse lists and JSON arrays
      const legendsArray = detailsForm.legends
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
        
      const factsArray = detailsForm.interestingFacts
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
        
      let timelineArray = [];
      try {
        timelineArray = JSON.parse(detailsForm.historicalTimeline || '[]');
      } catch (e) {
        throw new Error('Historical Timeline must be a valid JSON array of objects with year, title, and description.');
      }
      
      let eventsArray = [];
      try {
        eventsArray = JSON.parse(detailsForm.historicalEvents || '[]');
      } catch (e) {
        throw new Error('Historical Events must be a valid JSON array of objects with period, title, and description.');
      }
      
      const payload = {
        fullHistory: detailsForm.fullHistory,
        architecture: detailsForm.architecture,
        culturalImportance: detailsForm.culturalImportance,
        legends: legendsArray,
        restorationHistory: detailsForm.restorationHistory,
        interestingFacts: factsArray,
        visitingInformation: detailsForm.visitingInformation,
        historicalTimeline: timelineArray,
        historicalEvents: eventsArray
      };
      
      const response = await updateMonumentDetails(selectedMonument._id, payload, activeUserId);
      
      if (response.success && response.data) {
        setSuccessMessage('Monument details updated successfully!');
        
        // Immediately update local monuments state cache to reflect the edit
        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to update monument details.');
      }
    } catch (err: any) {
      console.error('[SAVE DETAILS ERROR]', err);
      setErrorMessage(err.message || 'Failed to update monument details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSaveSection = async (sectionId: string) => {
    if (!selectedMonument) return;
    const edits = sectionEdits[sectionId];
    if (!edits || !edits.title || !edits.content) {
      Alert.alert('Validation Error', 'Title and content are required.');
      return;
    }

    setIsHistoryLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const response = await updateHistorySection(
        selectedMonument._id,
        sectionId,
        {
          title: edits.title,
          content: edits.content,
          order: Number(edits.order) || 0
        },
        activeUserId
      );

      if (response.success && response.data) {
        setSuccessMessage('History section saved successfully.');
        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to save section.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save section.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedMonument) return;

    Alert.alert(
      'Delete History Section?',
      'Are you sure you want to delete this complete section along with all its uploaded images?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsHistoryLoading(true);
            setSuccessMessage(null);
            setErrorMessage(null);

            try {
              const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
              if (!activeUserId) {
                throw new Error('User context missing. Try logging in again.');
              }

              const response = await deleteHistorySection(selectedMonument._id, sectionId, activeUserId);

              if (response.success && response.data) {
                setSuccessMessage('History section deleted successfully.');
                const updatedMonument = response.data;
                setMonuments((prev) => 
                  prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
                ); 
                setSelectedMonument(updatedMonument);
              } else {
                setErrorMessage(response.message || 'Failed to delete section.');
              }
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to delete section.');
            } finally {
              setIsHistoryLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateNewSection = async () => {
    if (!selectedMonument) return;
    if (!newSectionTitle || !newSectionContent) {
      Alert.alert('Validation Error', 'Title and content are required.');
      return;
    }

    setIsHistoryLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const response = await createHistorySection(
        selectedMonument._id,
        {
          title: newSectionTitle,
          content: newSectionContent,
          order: Number(newSectionOrder) || 0
        },
        activeUserId
      );

      if (response.success && response.data) {
        setSuccessMessage('New history section created successfully!');
        setNewSectionTitle('');
        setNewSectionContent('');
        setNewSectionOrder('0');
        setShowNewSectionForm(false);

        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to create section.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create section.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleUploadSectionImage = async (sectionId: string) => {
    if (!selectedMonument) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        setIsHistoryLoading(true);
        setSuccessMessage(null);
        setErrorMessage(null);

        const uriParts = asset.uri.split('/');
        const name = uriParts[uriParts.length - 1];
        const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
        const type = `image/${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'}`;

        const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
        if (!activeUserId) {
          throw new Error('User context missing. Try logging in again.');
        }

        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          name: name,
          type: type
        } as any);

        const response = await uploadHistorySectionImage(
          selectedMonument._id,
          sectionId,
          formData,
          activeUserId
        );

        if (response.success && response.data) {
          setSuccessMessage('Section image uploaded successfully!');
          const updatedMonument = response.data;
          setMonuments((prev) => 
            prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
          ); 
          setSelectedMonument(updatedMonument);
        } else {
          setErrorMessage(response.message || 'Failed to upload section image.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload section image.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteSectionImage = async (sectionId: string, imageUrl: string) => {
    if (!selectedMonument) return;

    const imageId = imageUrl.split('/').pop();
    if (!imageId) return;

    Alert.alert(
      'Delete Image?',
      'Are you sure you want to remove this photograph from this history section?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsHistoryLoading(true);
            setSuccessMessage(null);
            setErrorMessage(null);

            try {
              const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
              if (!activeUserId) {
                throw new Error('User context missing. Try logging in again.');
              }

              const response = await deleteHistorySectionImage(
                selectedMonument._id,
                sectionId,
                imageId,
                activeUserId
              );

              if (response.success && response.data) {
                setSuccessMessage('Section image deleted successfully.');
                const updatedMonument = response.data;
                setMonuments((prev) => 
                  prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
                ); 
                setSelectedMonument(updatedMonument);
              } else {
                setErrorMessage(response.message || 'Failed to delete section image.');
              }
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to delete section image.');
            } finally {
              setIsHistoryLoading(false);
            }
          }
        }
      ]
    );
  };
 
  // Fetch all monuments for selection 
  useEffect(() => { 
    const fetchMonuments = async () => { 
      setIsLoading(true); 
      setErrorMessage(null); 
      try { 
        const response = await getMonuments({ limit: 50 }); 
        setMonuments(response.data); 
        if (response.data.length > 0) { 
          setSelectedMonument(response.data[0]); 
        } 
      } catch (err: any) { 
        setErrorMessage('Failed to load monuments. Please make sure the server is running.'); 
      } finally { 
        setIsLoading(false); 
      } 
    }; 
 
    fetchMonuments(); 
  }, []); 

  // Reset currentImageError when selectedMonument changes
  useEffect(() => {
    setCurrentImageError(false);
  }, [selectedMonument]);
 
  const handlePickImage = async () => { 
    setSuccessMessage(null); 
    setErrorMessage(null); 
    try { 
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); 
      if (status !== 'granted') { 
        Alert.alert('Permission Denied', 'Media library access permission is required to choose photographs.'); 
      } 
 
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ['images'], 
        allowsEditing: true, 
        quality: 0.8, 
      }); 
 
      if (!result.canceled && result.assets && result.assets.length > 0) { 
        const asset = result.assets[0]; 
        setImageUri(asset.uri); 
         
        // Extract file details 
        const uriParts = asset.uri.split('/'); 
        const name = uriParts[uriParts.length - 1]; 
         
        // Determine file type 
        const ext = name.split('.').pop()?.toLowerCase() || 'jpg'; 
        const type = `image/${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'}`; 
 
        setFileInfo({ 
          name: name, 
          type: type, 
          size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size', 
        }); 
      } 
    } catch (err) { 
      setErrorMessage('Failed to open image library.'); 
    } 
  }; 
   const handleUpload = async () => { 
    if (!selectedMonument) { 
      Alert.alert('Selection Required', 'Please select a monument first.'); 
      return; 
    } 
 
    if (!imageUri) { 
      setErrorMessage('Unable to read selected image.'); 
      return; 
    } 
 
    setIsUploading(true); 
    setSuccessMessage(null); 
    setErrorMessage(null); 
 
    // Determine file extension and validate JPEG, PNG, WEBP
    const uriParts = imageUri.split('.'); 
    const fileExtension = uriParts[uriParts.length - 1].toLowerCase(); 
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExtensions.includes(fileExtension)) {
      setErrorMessage('Please select a JPEG, PNG, or WEBP image.');
      setIsUploading(false);
      return;
    }

    // Set variable names specifically for debug logs and FormData
    const monumentId = selectedMonument._id;
    const fileName = fileInfo?.name || `upload-${selectedMonument.slug}.${fileExtension}`;
    const mimeType = fileInfo?.type || (fileExtension === 'png' ? 'image/png' : fileExtension === 'webp' ? 'image/webp' : 'image/jpeg');

    console.log("[UPLOAD DEBUG] URI:", imageUri); 
    console.log("[UPLOAD DEBUG] Name:", fileName); 
    console.log("[UPLOAD DEBUG] MIME:", mimeType); 
    console.log("[UPLOAD DEBUG] Monument ID:", monumentId); 
 
    try { 
      // Get active user ID 
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID; 
       
      if (!activeUserId) { 
        throw new Error('User context missing. Try logging in again.'); 
      } 
 
      // Create FormData payload 
      const formData = new FormData(); 
       
      formData.append('image', { 
        uri: imageUri, 
        name: fileName, 
        type: mimeType, 
      } as any); 
 
      console.log(`[UPLOAD] Sending image to backend for ${selectedMonument.name}`); 
      const response = await uploadMonumentImage(selectedMonument._id, formData, activeUserId); 
 
      if (response.success && response.data) { 
        console.log('[UPLOAD SUCCESS]');
        setSuccessMessage('Real photograph uploaded successfully'); 
        setImageUri(null); 
        setFileInfo(null); 
        setCurrentImageError(false);
         
        // Immediately update local monuments state cache to reflect the new image 
        const updatedMonument = response.data; 
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m)) 
        ); 
        setSelectedMonument(updatedMonument); 
      } else { 
        console.log('[UPLOAD ERROR]');
        setErrorMessage(response.message || 'Upload failed'); 
      } 
    } catch (err: any) { 
      console.log('[UPLOAD ERROR]', err); 
       
      // Custom error messages based on HTTP status code 
      if (err.status === 403) { 
        setErrorMessage('Admin permission required.'); 
      } else if (err.status === 413) { 
        setErrorMessage('Image is too large. Maximum size is 5MB.'); 
      } else if (err.status === 400) { 
        setErrorMessage(err.message || 'Upload failed'); 
      } else if (err.isTimeout || err.message?.includes('timed out')) {
        setErrorMessage('Upload timed out. Please check your connection and try again.');
      } else if (err.status === 0 || !err.status) {
        setErrorMessage('Unable to connect to the server.');
      } else { 
        setErrorMessage(err.message || 'Upload failed'); 
      } 
    } finally { 
      setIsUploading(false); 
    } 
  }; 

  const handleDeleteImage = () => {
    if (!selectedMonument) return;

    Alert.alert(
      "Delete Monument Image?",
      "Are you sure you want to remove the current photograph? This will not delete the monument.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsUploading(true);
            setSuccessMessage(null);
            setErrorMessage(null);
            try {
              const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
              if (!activeUserId) {
                throw new Error('User context missing. Try logging in again.');
              }

              const response = await deleteMonumentImage(selectedMonument._id, activeUserId);
              if (response.success && response.data) {
                setSuccessMessage('Monument image deleted successfully');
                setCurrentImageError(false);
                
                const updatedMonument = response.data;
                // Immediately update local monuments state cache to reflect the deletion
                setMonuments((prev) => 
                  prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
                ); 
                setSelectedMonument(updatedMonument);
              } else {
                setErrorMessage('Failed to delete monument image.');
              }
            } catch (err: any) {
              console.error('[DELETE ERROR]', err);
              if (err.status === 403) {
                setErrorMessage('Admin permission required.');
              } else if (err.status === 404) {
                setErrorMessage('Monument not found.');
              } else if (err.status === 0 || !err.status) {
                setErrorMessage('Unable to connect to the server.');
              } else {
                setErrorMessage(err.message || 'Failed to delete monument image.');
              }
            } finally {
              setIsUploading(false);
            }
          }
        }
      ]
    );
  };



  const handleCancelGenerateAIDetails = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    setIsGeneratingAI(false);
    setAiProgressStep('');
    setErrorMessage('Generation cancelled.');
  };

  const handleGenerateAIDetails = async () => {
    if (!selectedMonument) return;
    setIsGeneratingAI(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    const steps = [
      'Identifying monument...',
      'Generating historical information...',
      'Generating architectural information...',
      'Generating cultural information...',
      'Generating timeline...',
      'Generating preservation information...',
      'Generating visitor information...',
      'Preparing editable knowledge...'
    ];

    let currentStepIndex = 0;
    setAiProgressStep(steps[0]);

    const progressInterval = setInterval(() => {
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        setAiProgressStep(steps[currentStepIndex]);
      }
    }, 1200);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const response = await generateAIMonumentDetails(selectedMonument._id, activeUserId, { signal: controller.signal });
      
      clearInterval(progressInterval);
      setAiProgressStep('Preparing editable knowledge...');

      if (response.success && response.data) {
        setGeneratedDetails(response.data);
        
        const draft: any = { ...response.data };
        draft.alternativeNames = (response.data.alternativeNames || []).join('\n');
        draft.localNames = (response.data.localNames || []).join('\n');
        draft.historicalNames = (response.data.historicalNames || []).join('\n');
        draft.importantRulers = (response.data.importantRulers || []).join('\n');
        draft.historicalPersonalities = (response.data.historicalPersonalities || []).join('\n');
        draft.festivals = (response.data.festivals || []).join('\n');
        draft.rituals = (response.data.rituals || []).join('\n');
        draft.legends = (response.data.legends || []).join('\n');
        draft.localStories = (response.data.localStories || []).join('\n');
        draft.interestingStories = (response.data.interestingStories || []).join('\n');
        draft.mythologicalStories = (response.data.mythologicalStories || []).join('\n');
        draft.localTraditions = (response.data.localTraditions || []).join('\n');
        draft.nearbyPlaces = (response.data.nearbyPlaces || []).join('\n');
        draft.didYouKnow = (response.data.didYouKnow || []).join('\n');
        draft.importantFacts = (response.data.importantFacts || []).join('\n');
        draft.quizTopics = (response.data.quizTopics || []).join('\n');
        draft.architecturalHighlights = (response.data.architecturalHighlights || []).join('\n');
        draft.historicalHighlights = (response.data.historicalHighlights || []).join('\n');
        
        draft.historicalTimeline = JSON.stringify(response.data.historicalTimeline || [], null, 2);
        draft.historicalEvents = JSON.stringify(response.data.historicalEvents || [], null, 2);
        
        setDraftDetails(draft);
        setSuccessMessage('AI Details generated successfully! Preview and edit below.');
      } else {
        setErrorMessage(response.message || 'Failed to generate details.');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('[AI GENERATION ERROR]', err);
      // Only set error message if it wasn't cancelled (AbortError is already mapped to 'Generation cancelled.')
      if (err.message !== 'Generation cancelled.') {
        setErrorMessage(err.message || 'Failed to generate details.');
      }
    } finally {
      if (aiAbortControllerRef.current === controller) {
        aiAbortControllerRef.current = null;
      }
      setIsGeneratingAI(false);
      setAiProgressStep('');
    }
  };

  const mergeArrays = (arr1: any[] | undefined, arr2: any[] | undefined, keyField?: string) => {
    const a1 = arr1 || [];
    const a2 = arr2 || [];
    if (keyField) {
      const map = new Map();
      a1.forEach(item => {
        if (item && typeof item === 'object') {
          map.set(item[keyField], item);
        }
      });
      a2.forEach(item => {
        if (item && typeof item === 'object') {
          map.set(item[keyField], item);
        }
      });
      return Array.from(map.values());
    } else {
      return Array.from(new Set([...a1, ...a2]));
    }
  };

  const handleSaveAiGeneratedDetails = () => {
    if (!selectedMonument || !generatedDetails || !draftDetails) return;

    Alert.alert(
      'Confirm Save',
      'Are you sure you want to save this approved monument knowledge?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm & Save', onPress: () => executeSaveAiGeneratedDetails() }
      ]
    );
  };

  const executeSaveAiGeneratedDetails = async () => {
    if (!selectedMonument || !generatedDetails || !draftDetails) return;
    setIsSavingDetails(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const splitLines = (str: string) => 
        (str || '').split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      const parsedDraft: any = { ...draftDetails };
      parsedDraft.alternativeNames = splitLines(draftDetails.alternativeNames);
      parsedDraft.localNames = splitLines(draftDetails.localNames);
      parsedDraft.historicalNames = splitLines(draftDetails.historicalNames);
      parsedDraft.importantRulers = splitLines(draftDetails.importantRulers);
      parsedDraft.historicalPersonalities = splitLines(draftDetails.historicalPersonalities);
      parsedDraft.festivals = splitLines(draftDetails.festivals);
      parsedDraft.rituals = splitLines(draftDetails.rituals);
      parsedDraft.legends = splitLines(draftDetails.legends);
      parsedDraft.localStories = splitLines(draftDetails.localStories);
      parsedDraft.interestingStories = splitLines(draftDetails.interestingStories);
      parsedDraft.mythologicalStories = splitLines(draftDetails.mythologicalStories);
      parsedDraft.localTraditions = splitLines(draftDetails.localTraditions);
      parsedDraft.nearbyPlaces = splitLines(draftDetails.nearbyPlaces);
      parsedDraft.didYouKnow = splitLines(draftDetails.didYouKnow);
      parsedDraft.importantFacts = splitLines(draftDetails.importantFacts);
      parsedDraft.quizTopics = splitLines(draftDetails.quizTopics);
      parsedDraft.architecturalHighlights = splitLines(draftDetails.architecturalHighlights);
      parsedDraft.historicalHighlights = splitLines(draftDetails.historicalHighlights);

      try {
        parsedDraft.historicalTimeline = JSON.parse(draftDetails.historicalTimeline || '[]');
      } catch (e) {
        throw new Error('Historical Timeline must be a valid JSON array.');
      }

      try {
        parsedDraft.historicalEvents = JSON.parse(draftDetails.historicalEvents || '[]');
      } catch (e) {
        throw new Error('Historical Events must be a valid JSON array.');
      }

      if (draftDetails.coordinates && typeof draftDetails.coordinates === 'string') {
        try {
          parsedDraft.coordinates = JSON.parse(draftDetails.coordinates);
        } catch (e) {
          // ignore or set default
        }
      }

      const payload: any = {};

      const groups = {
        basic: [
          'district', 'coordinates', 'monumentType', 'historicalPeriod',
          'constructionYear', 'constructionPeriod', 'ruler', 'builder', 'architect',
          'alternativeNames', 'localNames', 'historicalNames'
        ],
        history: [
          'shortHistory', 'fullHistory', 'originStory', 'constructionHistory',
          'importantRulers', 'dynastyHistory', 'historicalTimeline', 'historicalEvents',
          'origin', 'constructionDate', 'originalPurpose', 'whyItWasBuilt',
          'historicalDevelopment', 'historicalChanges', 'historicalPersonalities'
        ],
        architecture: [
          'buildingMaterials', 'structuralFeatures', 'architecturalStyle', 'vimanaDetails',
          'gopuramDetails', 'mandapaDetails', 'sculptureDetails', 'pillarDetails',
          'ceilingDetails', 'inscriptionDetails', 'engineeringFeatures',
          'architectureDescription', 'layout', 'entrance', 'gopuram', 'vimana',
          'mandapa', 'pillars', 'sculptures', 'materials', 'uniqueArchitecturalFeatures'
        ],
        cultural: [
          'culturalImportance', 'religiousImportance', 'socialImportance', 'artisticImportance',
          'culturalPractices', 'traditionalPractices', 'festivals', 'rituals', 'legends',
          'mythology', 'localStories', 'interestingStories'
        ],
        legends: [
          'legends', 'mythology', 'localStories', 'interestingStories',
          'mythologicalStories', 'localTraditions'
        ],
        timeline: [
          'historicalTimeline', 'historicalEvents'
        ],
        preservation: [
          'preservationHistory', 'restorationHistory', 'damageHistory',
          'conservationEfforts', 'currentCondition', 'conservationAuthority'
        ],
        heritage: [
          'heritageStatus', 'unescoStatus', 'unescoYear', 'heritageRecognition',
          'protectedStatus'
        ],
        visitor: [
          'dressCode', 'visitorGuidelines', 'howToReach', 'visitingInformation',
          'openingHours', 'bestTimeToVisit', 'entryFee', 'nearbyPlaces',
          'openingInformation', 'dressGuidelines', 'photographyRules', 'accessibility'
        ],
        educational: [
          'didYouKnow', 'importantFacts', 'quizTopics',
          'architecturalHighlights', 'historicalHighlights'
        ]
      };

      Object.entries(groups).forEach(([groupName, fields]) => {
        const strategy = aiStrategies[groupName] || 'keep';
        if (strategy === 'keep') return;

        fields.forEach((field) => {
          const existingVal = (selectedMonument as any)[field];
          const draftVal = parsedDraft[field];

          if (strategy === 'replace') {
            payload[field] = draftVal;
          } else if (strategy === 'merge') {
            if (Array.isArray(existingVal)) {
              if (field === 'historicalTimeline') {
                payload[field] = mergeArrays(existingVal, draftVal, 'year');
              } else if (field === 'historicalEvents') {
                payload[field] = mergeArrays(existingVal, draftVal, 'period');
              } else {
                payload[field] = mergeArrays(existingVal, draftVal);
              }
            } else if (typeof existingVal === 'string') {
              payload[field] = (existingVal || '').trim() ? existingVal : draftVal;
            } else if (existingVal && typeof existingVal === 'object') {
              payload[field] = { ...draftVal, ...existingVal };
            } else {
              payload[field] = existingVal !== undefined ? existingVal : draftVal;
            }
          }
        });
      });

      let finalMonument = selectedMonument;
      if (Object.keys(payload).length > 0) {
        const response = await updateMonumentDetails(selectedMonument._id, payload, activeUserId);
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to update monument details.');
        }
        finalMonument = response.data;
      }

      // Handle historySections strategy if any
      const sectionStrategy = aiStrategies.history || 'keep';
      if (sectionStrategy !== 'keep' && generatedDetails.historySections) {
        setIsHistoryLoading(true);
        if (sectionStrategy === 'replace') {
          const existingSections = selectedMonument.historySections || [];
          for (const sec of existingSections) {
            if (sec.id) {
              await deleteHistorySection(selectedMonument._id, sec.id, activeUserId);
            }
          }
        }
        const sectionsToCreate = generatedDetails.historySections;
        for (const sec of sectionsToCreate) {
          const createResponse = await createHistorySection(selectedMonument._id, sec, activeUserId);
          if (createResponse.success && createResponse.data) {
            finalMonument = createResponse.data;
          }
        }
        setIsHistoryLoading(false);
      }

      setSuccessMessage('Approved monument details saved and published successfully!');
      setMonuments((prev) => 
        prev.map((m) => (m._id === finalMonument._id ? finalMonument : m))
      ); 
      setSelectedMonument(finalMonument);
      setGeneratedDetails(null);
      setDraftDetails(null);
    } catch (err: any) {
      console.error('[AI SAVE ERROR]', err);
      setErrorMessage(err.message || 'Failed to save generated details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleCancelDiscoverImages = () => {
    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
      imageAbortControllerRef.current = null;
    }
    setIsDiscoveringImages(false);
    setErrorMessage('Generation cancelled.');
  };

  const handleDiscoverImages = async () => {
    if (!selectedMonument) return;
    setIsDiscoveringImages(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (imageAbortControllerRef.current) {
      imageAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    imageAbortControllerRef.current = controller;

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const response = await discoverAIMonumentImages(selectedMonument._id, activeUserId, { signal: controller.signal });
      if (response.success && response.data) {
        setDiscoveredImages(response.data);
        setSuccessMessage(`Discovered ${response.data.length} authentic photo references!`);
      } else {
        setErrorMessage(response.message || 'Failed to discover images.');
      }
    } catch (err: any) {
      console.error('[IMAGE DISCOVERY ERROR]', err);
      if (err.message !== 'Generation cancelled.') {
        setErrorMessage(err.message || 'Failed to discover images.');
      }
    } finally {
      if (imageAbortControllerRef.current === controller) {
        imageAbortControllerRef.current = null;
      }
      setIsDiscoveringImages(false);
    }
  };

  const handleApproveDiscoveredImage = async (image: ApiMonumentImage) => {
    if (!selectedMonument) return;
    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) return;

      const payload = {
        imageUrl: image.imageUrl,
        title: image.title || '',
        description: image.description || '',
        imageType: image.imageType,
        source: image.source || 'Wikimedia Commons',
        sourceUrl: image.sourceUrl || '',
        photographer: image.photographer || 'Unknown',
        year: image.year || 'Unknown',
        license: image.license || 'CC BY-SA',
        credit: image.credit || '',
        verificationStatus: 'admin-verified'
      };

      const response = await uploadGalleryImage(selectedMonument._id, payload, activeUserId);
      if (response.success && response.data) {
        setSelectedMonument(response.data);
        setMonuments((prev) => 
          prev.map((m) => (m._id === response.data?._id ? response.data : m))
        );
        setDiscoveredImages(prev => prev.filter(img => img.imageUrl !== image.imageUrl));
        Alert.alert('Success', 'Photograph approved and added to monument gallery!');
      } else {
        Alert.alert('Error', response.message || 'Failed to approve photograph.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve photograph.');
    }
  };

  const handleRejectDiscoveredImage = (imageUrl: string) => {
    setDiscoveredImages(prev => prev.filter(img => img.imageUrl !== imageUrl));
  };

  const handlePickGalleryImage = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access permission is required to choose photographs.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setGalleryImageUri(asset.uri);

        const uriParts = asset.uri.split('/');
        const name = uriParts[uriParts.length - 1];

        const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
        const type = `image/${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'}`;

        setGalleryFileInfo({
          name: name,
          type: type,
          size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size',
        });
      }
    } catch (err) {
      setErrorMessage('Failed to open image library.');
    }
  };

  const handleUploadGalleryImage = async () => {
    if (!selectedMonument || !galleryImageUri) return;

    setIsGalleryLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const formData = new FormData();
      formData.append('image', {
        uri: galleryImageUri,
        name: galleryFileInfo?.name || 'photo.jpg',
        type: galleryFileInfo?.type || 'image/jpeg'
      } as any);

      formData.append('imageType', activeGalleryTab);
      if (galleryTitle) formData.append('title', galleryTitle);
      if (galleryDescription) formData.append('description', galleryDescription);
      if (gallerySource) formData.append('source', gallerySource);
      if (gallerySourceUrl) formData.append('sourceUrl', gallerySourceUrl);
      if (galleryPhotographer) formData.append('photographer', galleryPhotographer);
      if (galleryYear) formData.append('year', galleryYear);
      if (galleryCredit) formData.append('credit', galleryCredit);
      if (galleryLicense) formData.append('license', galleryLicense);

      const response = await uploadGalleryImage(selectedMonument._id, formData, activeUserId);

      if (response.success && response.data) {
        setSuccessMessage('Gallery photograph uploaded successfully!');
        setGalleryImageUri(null);
        setGalleryFileInfo(null);
        setGalleryTitle('');
        setGalleryDescription('');
        setGallerySource('');
        setGallerySourceUrl('');
        setGalleryPhotographer('');
        setGalleryYear('');
        setGalleryCredit('');
        setGalleryLicense('');
        
        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to upload gallery photograph.');
      }
    } catch (err: any) {
      console.error('[GALLERY UPLOAD ERROR]', err);
      setErrorMessage(err.message || 'Failed to upload gallery photograph.');
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const handleUpdateGalleryImageMetadata = async (imageId: string) => {
    if (!selectedMonument || !editingImageForm) return;

    setIsGalleryLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
      if (!activeUserId) {
        throw new Error('User context missing. Try logging in again.');
      }

      const formData = new FormData();
      formData.append('imageType', activeGalleryTab);
      if (editingImageForm.title) formData.append('title', editingImageForm.title);
      if (editingImageForm.description) formData.append('description', editingImageForm.description);
      if (editingImageForm.source) formData.append('source', editingImageForm.source);
      if (editingImageForm.sourceUrl) formData.append('sourceUrl', editingImageForm.sourceUrl);
      if (editingImageForm.photographer) formData.append('photographer', editingImageForm.photographer);
      if (editingImageForm.year) formData.append('year', editingImageForm.year);
      if (editingImageForm.credit) formData.append('credit', editingImageForm.credit);
      if (editingImageForm.license) formData.append('license', editingImageForm.license);

      const response = await updateGalleryImageMetadata(selectedMonument._id, imageId, formData, activeUserId);

      if (response.success && response.data) {
        setSuccessMessage('Gallery photograph metadata updated successfully!');
        setEditingImageId(null);
        setEditingImageForm(null);
        
        const updatedMonument = response.data;
        setMonuments((prev) => 
          prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
        ); 
        setSelectedMonument(updatedMonument);
      } else {
        setErrorMessage(response.message || 'Failed to update metadata.');
      }
    } catch (err: any) {
      console.error('[GALLERY UPDATE METADATA ERROR]', err);
      setErrorMessage(err.message || 'Failed to update metadata.');
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!selectedMonument) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this gallery photograph?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsGalleryLoading(true);
            setSuccessMessage(null);
            setErrorMessage(null);

            try {
              const activeUserId = await AsyncStorage.getItem('active_user_id') || process.env.EXPO_PUBLIC_GUEST_USER_ID;
              if (!activeUserId) {
                throw new Error('User context missing. Try logging in again.');
              }

              const response = await deleteGalleryImage(selectedMonument._id, imageId, activeUserId);

              if (response.success && response.data) {
                setSuccessMessage('Gallery photograph deleted successfully.');
                const updatedMonument = response.data;
                setMonuments((prev) => 
                  prev.map((m) => (m._id === updatedMonument._id ? updatedMonument : m))
                ); 
                setSelectedMonument(updatedMonument);
              } else {
                setErrorMessage(response.message || 'Failed to delete gallery photograph.');
              }
            } catch (err: any) {
              console.error('[GALLERY DELETE ERROR]', err);
              setErrorMessage(err.message || 'Failed to delete gallery photograph.');
            } finally {
              setIsGalleryLoading(false);
            }
          }
        }
      ]
    );
  };

 
  const renderMonumentItem = ({ item }: { item: ApiMonument }) => ( 
    <TouchableOpacity 
      style={[ 
        styles.monumentSelectItem, 
        selectedMonument?._id === item._id && styles.monumentSelectItemActive, 
      ]} 
      onPress={() => { 
        setSelectedMonument(item); 
        setIsPickerVisible(false); 
        setSuccessMessage(null); 
        setErrorMessage(null); 
      }} 
    > 
      <Text style={styles.monumentSelectItemText}>{item.name}</Text> 
      <Text style={styles.monumentSelectItemSubtext}>{item.location}, {item.state}</Text> 
    </TouchableOpacity> 
  ); 
 
  const hasCurrentImage = !!selectedMonument?.imageUrl; 
  const currentImageUri = selectedMonument?.image; 

 
  return ( 
    <SafeAreaView style={styles.safeArea}> 
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} /> 
      <View style={styles.header}> 
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}> 
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} /> 
        </TouchableOpacity> 
        <View> 
          <Text style={styles.headerTitle}>Monument Image Manager</Text> 
          <Text style={styles.headerSubtitle}>Upload and manage real monument photographs</Text> 
        </View> 
      </View> 
 
      <ScrollView contentContainerStyle={styles.scrollContent}> 
        {isLoading ? ( 
          <View style={styles.centeredContainer}> 
            <ActivityIndicator size="large" color={COLORS.gold} /> 
            <Text style={styles.statusText}>Loading heritage records...</Text> 
          </View> 
        ) : ( 
          <View style={styles.formContainer}> 
             
            {/* SELECT MONUMENT SECTION */} 
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>SELECT MONUMENT</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View> 
 
            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsPickerVisible(true)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="map-pin" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}> 
                  {selectedMonument ? selectedMonument.name : 'Select Monument'} 
                </Text> 
              </View> 
              <Feather name="chevron-down" size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity> 
 
            {/* CURRENT IMAGE SECTION */} 
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>CURRENT IMAGE</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View> 
 
            {hasCurrentImage && currentImageUri && !currentImageError ? ( 
              <View style={styles.currentImageWrapper}> 
                <Image 
                  source={{ uri: getImageUrl(currentImageUri) }} 
                  style={styles.currentImage} 
                  onError={() => setCurrentImageError(true)}
                /> 
                <Text style={styles.currentImageText}>Current Image</Text> 
                
                <TouchableOpacity 
                  style={[styles.deleteBtn, { marginTop: SPACING.sm }]} 
                  onPress={handleDeleteImage} 
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Delete Current Image</Text>
                </TouchableOpacity>
              </View> 
            ) : ( 
              <View style={styles.noCurrentImageBox}> 
                <Feather name="image" size={32} color={COLORS.textSecondary} style={{ marginBottom: 4 }} /> 
                <Text style={styles.noCurrentImageText}>Real image unavailable</Text> 
              </View> 
            )} 
 
            {/* UPLOAD NEW IMAGE SECTION */} 
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>UPLOAD NEW IMAGE</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View> 
 
            <TouchableOpacity 
              style={styles.pickerBtn} 
              onPress={handlePickImage} 
              activeOpacity={0.8} 
            > 
              <Text style={styles.pickerBtnText}>📷 Pick Real Photograph</Text> 
            </TouchableOpacity> 
 
            {/* IMAGE PREVIEW SECTION */} 
            {imageUri && ( 
              <View style={styles.previewSection}> 
                <View style={styles.sectionHeader}> 
                  <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
                  <Text style={styles.sectionHeaderTitle}>IMAGE PREVIEW</Text> 
                  <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
                </View> 
 
                <View style={styles.previewCard}> 
                  <Image source={{ uri: imageUri }} style={styles.previewImage} /> 
                  <View style={styles.previewDetails}> 
                    <Text style={styles.detailText} numberOfLines={1}> 
                      <Text style={styles.detailLabel}>File name:</Text> {fileInfo?.name} 
                    </Text> 
                    <Text style={styles.detailText}> 
                      <Text style={styles.detailLabel}>File type:</Text> {fileInfo?.type} 
                    </Text> 
                    <Text style={styles.detailText}> 
                      <Text style={styles.detailLabel}>File size:</Text> {fileInfo?.size} 
                    </Text> 
                  </View> 
                </View> 
              </View> 
            )} 
 
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View> 
 
            {/* Success & Error Message Banners */} 
            {successMessage && ( 
              <View style={styles.successBanner}> 
                <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} /> 
                <Text style={styles.successText}>{successMessage}</Text> 
              </View> 
            )} 
 
            {errorMessage && ( 
              <View style={styles.errorBanner}> 
                <Feather name="alert-circle" size={16} color="#FFF" style={{ marginRight: 8 }} /> 
                <Text style={styles.errorText}>{errorMessage}</Text> 
              </View> 
            )} 
 
            {/* Upload Button */} 
            {isUploading ? ( 
              <View style={styles.uploadingContainer}> 
                <ActivityIndicator size="small" color={COLORS.gold} /> 
                <Text style={styles.uploadingText}>Uploading...</Text> 
              </View> 
            ) : ( 
              <PrimaryButton 
                title={hasCurrentImage ? "Replace Current Image" : "Upload Real Photograph"} 
                onPress={handleUpload} 
                disabled={!imageUri || !selectedMonument} 
                style={styles.uploadBtn} 
              /> 
            )} 

            {/* 3D model upload section removed */}

            {/* AI MONUMENT CONTENT GENERATOR SECTION */}
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>AI MONUMENT CONTENT GENERATOR</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View>

            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsAICollapsibleOpen(!isAICollapsibleOpen)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="cpu" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}>
                  {isAICollapsibleOpen ? 'Close AI Generator' : 'Open AI Generator'}
                </Text> 
              </View> 
              <Feather name={isAICollapsibleOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity>

            {isAICollapsibleOpen && (
              <View style={styles.editorFormContainer}>
                {isGeneratingAI ? (
                  <View style={styles.historyLoader}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.historyLoaderText}>
                      {aiProgressStep || 'Generating AI Heritage Details...'}
                    </Text>
                    <TouchableOpacity 
                      style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 4 }}
                      onPress={handleCancelGenerateAIDetails}
                    >
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : !generatedDetails ? (
                  <View style={{ padding: SPACING.md, alignItems: 'center', gap: SPACING.md }}>
                    <Feather name="zap" size={32} color={COLORS.gold} />
                    <Text style={{ color: COLORS.textSecondary, textAlign: 'center', ...TYPOGRAPHY.bodyMedium }}>
                      Automatically generate high-fidelity historical details, timeline events, architectural descriptions, cultural significance, visitor guidelines, and structured history sections using Gemini AI.
                    </Text>
                    <PrimaryButton
                      title="Generate Details with AI"
                      onPress={handleGenerateAIDetails}
                      disabled={!selectedMonument || isGeneratingAI}
                      style={{ width: '100%' }}
                    />
                  </View>
                ) : (
                  <View style={{ gap: SPACING.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.gold, ...TYPOGRAPHY.h3, fontWeight: '700' }}>AI Draft Preview & Editor</Text>
                      <TouchableOpacity 
                        style={{ backgroundColor: COLORS.surfaceLight, padding: 6, borderRadius: BORDER_RADIUS.sm }}
                        onPress={() => {
                          setGeneratedDetails(null);
                          setDraftDetails(null);
                        }}
                      >
                        <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' }}>Discard</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Horizontal tabs for previewing different sections in draft */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: SPACING.xs }}>
                      {[
                        { key: 'basic', label: 'Basic Info' },
                        { key: 'history', label: 'History' },
                        { key: 'architecture', label: 'Architecture' },
                        { key: 'cultural', label: 'Cultural Importance' },
                        { key: 'legends', label: 'Legends & Stories' },
                        { key: 'timeline', label: 'Timeline & Events' },
                        { key: 'preservation', label: 'Preservation' },
                        { key: 'heritage', label: 'Heritage Status' },
                        { key: 'visitor', label: 'Visitor Info' },
                        { key: 'educational', label: 'Educational Info' }
                      ].map((tab) => (
                        <TouchableOpacity
                          key={tab.key}
                          style={[
                            styles.tabBtn,
                            activeAITab === tab.key && styles.tabBtnActive,
                            { marginRight: 8, height: 32 }
                          ]}
                          onPress={() => setActiveAITab(tab.key as any)}
                        >
                          <Text style={[
                            styles.tabBtnText,
                            activeAITab === tab.key && styles.tabBtnTextActive,
                            { fontSize: 11 }
                          ]}>
                            {tab.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Merge Strategy Option for Active Section */}
                    <View style={{ backgroundColor: COLORS.surfaceLight, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
                      <Text style={{ color: COLORS.textPrimary, ...TYPOGRAPHY.caption, fontWeight: '700' }}>
                        Merge Strategy for this Section Group:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { key: 'keep', label: 'Keep Existing' },
                          { key: 'replace', label: 'Replace' },
                          { key: 'merge', label: 'Merge & De-duplicate' }
                        ].map((strat) => (
                          <TouchableOpacity
                            key={strat.key}
                            style={{
                              flex: 1,
                              backgroundColor: aiStrategies[activeAITab] === strat.key ? COLORS.gold : COLORS.surface,
                              borderWidth: 1,
                              borderColor: COLORS.border,
                              borderRadius: BORDER_RADIUS.sm,
                              paddingVertical: 6,
                              alignItems: 'center'
                            }}
                            onPress={() => setAiStrategies(prev => ({ ...prev, [activeAITab]: strat.key as any }))}
                          >
                            <Text style={{
                              color: aiStrategies[activeAITab] === strat.key ? COLORS.background : COLORS.textSecondary,
                              fontSize: 10,
                              fontWeight: '700'
                            }}>
                              {strat.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Form Fields for Active AI Tab */}
                    {activeAITab === 'basic' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>District</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="District"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.district}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, district: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Coordinates (JSON: latitude, longitude)</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder='{"latitude": 12.9, "longitude": 80.2}'
                            placeholderTextColor={COLORS.textSecondary}
                            value={typeof draftDetails.coordinates === 'object' ? JSON.stringify(draftDetails.coordinates) : draftDetails.coordinates}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, coordinates: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Monument Type</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Monument Type (e.g. Temple, Fort)"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.monumentType}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, monumentType: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Period</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Historical Period"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.historicalPeriod}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalPeriod: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Construction Year</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Construction Year"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.constructionYear}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, constructionYear: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Construction Period</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Construction Period"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.constructionPeriod}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, constructionPeriod: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Ruler / Dynasty</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Ruler"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.ruler}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, ruler: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Builder</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Builder"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.builder}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, builder: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Architect</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="Architect"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.architect}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, architect: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'history' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Short History Summary</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Short History"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.shortHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, shortHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Full History Markdown</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 120 }]}
                            multiline
                            placeholder="Full History"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.fullHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, fullHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Origin Story / Mythology</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Origin Story"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.originStory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, originStory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Construction History</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Construction History"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.constructionHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, constructionHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Important Rulers (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Important Rulers"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.importantRulers}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, importantRulers: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Dynasty History</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Dynasty History"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.dynastyHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, dynastyHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Timeline JSON (year, title, description)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 100 }]}
                            multiline
                            placeholder="Historical Timeline JSON"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.historicalTimeline}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalTimeline: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Events JSON (period, title, description)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 100 }]}
                            multiline
                            placeholder="Historical Events JSON"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.historicalEvents}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalEvents: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'architecture' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Building Materials Used</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="e.g. Red sandstone, Granite"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.buildingMaterials}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, buildingMaterials: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Architectural Style</Text>
                          <TextInput
                            style={styles.textInputLine}
                            placeholder="e.g. Dravidian, Indo-Islamic"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.architecturalStyle}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, architecturalStyle: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Structural Features</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            placeholder="Structural Features"
                            placeholderTextColor={COLORS.textSecondary}
                            value={draftDetails.structuralFeatures}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, structuralFeatures: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Vimana details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.vimanaDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, vimanaDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Gopuram details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.gopuramDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, gopuramDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Mandapa details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.mandapaDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, mandapaDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Sculpture details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.sculptureDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, sculptureDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Pillar details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.pillarDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, pillarDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Ceiling details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.ceilingDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, ceilingDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Inscription details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.inscriptionDetails}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, inscriptionDetails: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Engineering Features</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.engineeringFeatures}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, engineeringFeatures: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'cultural' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Cultural Importance</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.culturalImportance}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, culturalImportance: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Religious Importance</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.religiousImportance}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, religiousImportance: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Social Importance</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.socialImportance}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, socialImportance: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Artistic Importance</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.artisticImportance}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, artisticImportance: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Cultural Practices</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.culturalPractices}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, culturalPractices: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Traditional Practices</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.traditionalPractices}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, traditionalPractices: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Festivals (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.festivals}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, festivals: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Rituals (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.rituals}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, rituals: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'legends' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Legends (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.legends}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, legends: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Mythology</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.mythology}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, mythology: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Local Stories (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.localStories}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, localStories: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Interesting Stories (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.interestingStories}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, interestingStories: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Mythological Stories (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.mythologicalStories}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, mythologicalStories: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Local Traditions (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.localTraditions}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, localTraditions: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'timeline' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Timeline JSON (year, title, description, significance)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 120 }]}
                            multiline
                            value={draftDetails.historicalTimeline}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalTimeline: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Events JSON (period, title, description)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 120 }]}
                            multiline
                            value={draftDetails.historicalEvents}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalEvents: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'preservation' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Preservation History</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.preservationHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, preservationHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Restoration History</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.restorationHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, restorationHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Damage History</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.damageHistory}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, damageHistory: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Conservation Efforts</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.conservationEfforts}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, conservationEfforts: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Current Condition</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.currentCondition}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, currentCondition: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Conservation Authority</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.conservationAuthority}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, conservationAuthority: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'heritage' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Heritage Status</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.heritageStatus}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, heritageStatus: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>UNESCO Status</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.unescoStatus}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, unescoStatus: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>UNESCO Recognition Year</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.unescoYear}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, unescoYear: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Heritage Recognition Details</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.heritageRecognition}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, heritageRecognition: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Protected Status</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.protectedStatus}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, protectedStatus: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'visitor' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Visiting Information Summary</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.visitingInformation}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, visitingInformation: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Opening Hours</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.openingHours}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, openingHours: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Best Time To Visit</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.bestTimeToVisit}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, bestTimeToVisit: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Entry Fee</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.entryFee}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, entryFee: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Dress Code</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.dressCode}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, dressCode: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Visitor Guidelines</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.visitorGuidelines}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, visitorGuidelines: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>How to Reach</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.howToReach}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, howToReach: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Nearby Places (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.nearbyPlaces}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, nearbyPlaces: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Opening Information</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.openingInformation}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, openingInformation: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Dress Guidelines</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.dressGuidelines}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, dressGuidelines: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Photography Rules</Text>
                          <TextInput
                            style={styles.textInputLine}
                            value={draftDetails.photographyRules}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, photographyRules: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Accessibility Guidelines</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 60 }]}
                            multiline
                            value={draftDetails.accessibility}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, accessibility: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {activeAITab === 'educational' && (
                      <View style={{ gap: SPACING.md }}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Did You Know Facts (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 120 }]}
                            multiline
                            value={draftDetails.didYouKnow}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, didYouKnow: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Important Facts Summary (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 100 }]}
                            multiline
                            value={draftDetails.importantFacts}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, importantFacts: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Quiz Topics / Keywords (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.quizTopics}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, quizTopics: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Architectural Highlights (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.architecturalHighlights}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, architecturalHighlights: val }))}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Historical Highlights (One per line)</Text>
                          <TextInput
                            style={[styles.textInputArea, { minHeight: 80 }]}
                            multiline
                            value={draftDetails.historicalHighlights}
                            onChangeText={(val) => setDraftDetails((prev: any) => ({ ...prev, historicalHighlights: val }))}
                          />
                        </View>
                      </View>
                    )}

                    {/* Actions for Save AI Details */}
                    {isSavingDetails ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="small" color={COLORS.gold} />
                        <Text style={styles.uploadingText}>Applying and Saving AI details...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md }}>
                        <PrimaryButton
                          title="Save generated details"
                          onPress={handleSaveAiGeneratedDetails}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* EDIT MONUMENT DETAILS SECTION */}
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>EDIT MONUMENT DETAILS</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View>

            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsDetailsCollapsibleOpen(!isDetailsCollapsibleOpen)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="edit-3" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}>
                  {isDetailsCollapsibleOpen ? 'Close Details Editor' : 'Open Details Editor'}
                </Text> 
              </View> 
              <Feather name={isDetailsCollapsibleOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity>

            {isDetailsCollapsibleOpen && (
              <View style={styles.editorFormContainer}>
                {/* Full History */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full History</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 120 }]}
                    multiline
                    placeholder="Enter detailed complete history..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.fullHistory}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, fullHistory: val }))}
                  />
                </View>

                {/* Architecture */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Architecture Details</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 100 }]}
                    multiline
                    placeholder="Enter architectural structure description..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.architecture}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, architecture: val }))}
                  />
                </View>

                {/* Cultural Importance */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cultural Importance</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="Enter cultural and social significance..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.culturalImportance}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, culturalImportance: val }))}
                  />
                </View>

                {/* Legends */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Legends & Stories (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="Enter myths and legends associated..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.legends}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, legends: val }))}
                  />
                </View>

                {/* Restoration History */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Restoration & Preservation History</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="Enter restoration history..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.restorationHistory}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, restorationHistory: val }))}
                  />
                </View>

                {/* Interesting Facts */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Interesting Facts (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="Enter fun/educational facts..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.interestingFacts}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, interestingFacts: val }))}
                  />
                </View>

                {/* Visiting Information */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Visiting Information</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="Enter visitor guidelines, dress code, tickets..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.visitingInformation}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, visitingInformation: val }))}
                  />
                </View>

                {/* Timeline JSON */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Historical Timeline (JSON format)</Text>
                  <TextInput
                    style={[
                      styles.textInputArea,
                      {
                        minHeight: 120,
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                        fontSize: 11
                      }
                    ]}
                    multiline
                    placeholder='[ { "year": "1010 CE", "title": "Completed", "description": "Consecrated by King..." } ]'
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.historicalTimeline}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, historicalTimeline: val }))}
                  />
                </View>

                {/* Events JSON */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Historical Events (JSON format)</Text>
                  <TextInput
                    style={[
                      styles.textInputArea,
                      {
                        minHeight: 120,
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                        fontSize: 11
                      }
                    ]}
                    multiline
                    placeholder='[ { "period": "11th Century", "title": "Royal Dedication", "description": "Dedicated by royal family..." } ]'
                    placeholderTextColor={COLORS.textSecondary}
                    value={detailsForm.historicalEvents}
                    onChangeText={(val) => setDetailsForm((prev: any) => ({ ...prev, historicalEvents: val }))}
                  />
                </View>

                {/* Save Details Button */}
                {isSavingDetails ? (
                  <View style={[styles.uploadingContainer, { marginTop: SPACING.md }]}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.uploadingText}>Saving Details...</Text>
                  </View>
                ) : (
                  <PrimaryButton
                    title="SAVE DETAILS"
                    onPress={handleSaveDetails}
                    disabled={!selectedMonument}
                    style={{ marginTop: SPACING.md }}
                  />
                )}
              </View>
            )}

            {/* MONUMENT RECOGNITION DATA SECTION */}
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>MONUMENT RECOGNITION DATA</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View>

            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsRecCollapsibleOpen(!isRecCollapsibleOpen)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="eye" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}>
                  {isRecCollapsibleOpen ? 'Close Recognition Manager' : 'Open Recognition Manager'}
                </Text> 
              </View> 
              <Feather name={isRecCollapsibleOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity>

            {isRecCollapsibleOpen && (
              <View style={styles.editorFormContainer}>
                <Text style={styles.groupHeading}>RECOGNITION METADATA PROFILE</Text>
                
                {/* Distinctive Features */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Distinctive Features (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="e.g. Concentric wall layers&#10;Highly detailed stone carvings..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.distinctiveFeatures}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, distinctiveFeatures: val }))}
                  />
                </View>

                {/* Architectural Identifiers */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Architectural Identifiers (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 80 }]}
                    multiline
                    placeholder="e.g. Dravidian Gopuram&#10;Chola style pillars..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.architecturalIdentifiers}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, architecturalIdentifiers: val }))}
                  />
                </View>

                {/* Visual Landmarks */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Visual Landmarks (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="e.g. Giant monolithic Nandi statue&#10;Adjacent temple tank..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.visualLandmarks}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, visualLandmarks: val }))}
                  />
                </View>

                {/* Common Viewpoints */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Common Viewpoints (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="e.g. East Entrance Frontal&#10;Northwest Corner View..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.commonViewpoints}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, commonViewpoints: val }))}
                  />
                </View>

                {/* Entrance Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Entrance Description</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="Describe the shape, size, and layout of the main entrance..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.entranceDescription}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, entranceDescription: val }))}
                  />
                </View>

                {/* Gopuram Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gopuram / Tower Description</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="Describe the main gopuram tower(s) geometry, height, tiers..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.gopuramDescription}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, gopuramDescription: val }))}
                  />
                </View>

                {/* Vimana Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vimana Description</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="Describe the vimana structure over the inner sanctum..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.vimanaDescription}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, vimanaDescription: val }))}
                  />
                </View>

                {/* Mandapa Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mandapa Description</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="Describe the pillared halls/mandapas inside the complex..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.mandapaDescription}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, mandapaDescription: val }))}
                  />
                </View>

                {/* Sculpture Identifiers */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sculpture Identifiers (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="e.g. Nataraja posture&#10;Dvarapala gatekeepers..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.sculptureIdentifiers}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, sculptureIdentifiers: val }))}
                  />
                </View>

                {/* Inscription Identifiers */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Inscription Identifiers (One per line)</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="e.g. Grantha Tamil scripts on south wall&#10;Sanskrit copper plate records..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.inscriptionIdentifiers}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, inscriptionIdentifiers: val }))}
                  />
                </View>

                {/* Recognition Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>General Recognition Notes</Text>
                  <TextInput
                    style={[styles.textInputArea, { minHeight: 60 }]}
                    multiline
                    placeholder="Important notes to guide the visual classifier..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={recProfileForm.recognitionNotes}
                    onChangeText={(val) => setRecProfileForm((prev: any) => ({ ...prev, recognitionNotes: val }))}
                  />
                </View>

                {/* Save Profile Button */}
                {isSavingRec ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.uploadingText}>Saving recognition profile...</Text>
                  </View>
                ) : (
                  <PrimaryButton
                    title="SAVE RECOGNITION PROFILE"
                    onPress={handleSaveRecProfile}
                    style={{ marginBottom: SPACING.lg }}
                  />
                )}
              </View>
            )}

            {/* BUILD MONUMENT HISTORY SECTION */}
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>BUILD MONUMENT HISTORY</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View>

            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsHistoryCollapsibleOpen(!isHistoryCollapsibleOpen)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="book-open" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}>
                  {isHistoryCollapsibleOpen ? 'Close History Builder' : 'Open History Builder'}
                </Text> 
              </View> 
              <Feather name={isHistoryCollapsibleOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity>

            {isHistoryCollapsibleOpen && (
              <View style={styles.historyBuilderContainer}>
                {isHistoryLoading && (
                  <View style={styles.historyLoader}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.historyLoaderText}>Processing changes...</Text>
                  </View>
                )}

                {/* List Existing Sections */}
                {(selectedMonument?.historySections || []).map((section) => {
                  const sId = section.id || '';
                  const editData = sectionEdits[sId] || { title: section.title, content: section.content, order: String(section.order) };
                  return (
                    <View key={sId} style={styles.sectionBuilderCard}>
                      <View style={styles.sectionCardHeader}>
                        <Text style={styles.sectionCardTitle}>HISTORY SECTION</Text>
                      </View>

                      {/* Title input */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Section Title</Text>
                        <TextInput
                          style={styles.textInputLine}
                          placeholder="e.g. Origin of the Temple"
                          placeholderTextColor={COLORS.textSecondary}
                          value={editData.title}
                          onChangeText={(val) => setSectionEdits(prev => ({
                            ...prev,
                            [sId]: { ...editData, title: val }
                          }))}
                        />
                      </View>

                      {/* Content input */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Detailed Content</Text>
                        <TextInput
                          style={[styles.textInputArea, { minHeight: 80 }]}
                          multiline
                          placeholder="Detailed historical description..."
                          placeholderTextColor={COLORS.textSecondary}
                          value={editData.content}
                          onChangeText={(val) => setSectionEdits(prev => ({
                            ...prev,
                            [sId]: { ...editData, content: val }
                          }))}
                        />
                      </View>

                      {/* Order input */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Order (Ascending)</Text>
                        <TextInput
                          style={styles.textInputLine}
                          placeholder="e.g. 1"
                          placeholderTextColor={COLORS.textSecondary}
                          keyboardType="numeric"
                          value={editData.order}
                          onChangeText={(val) => setSectionEdits(prev => ({
                            ...prev,
                            [sId]: { ...editData, order: val }
                          }))}
                        />
                      </View>

                      {/* Section Images list */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Images</Text>
                        <View style={styles.imagesGrid}>
                          {(section.imageUrls || []).map((imgUrl, imgIdx) => {
                            const absoluteUrl = getImageUrl(imgUrl);
                            return (
                              <View key={imgIdx} style={styles.sectionImageWrapper}>
                                <Image source={{ uri: absoluteUrl }} style={styles.sectionThumbnail} />
                                <TouchableOpacity 
                                  style={styles.removeImgBadge}
                                  onPress={() => handleDeleteSectionImage(sId, imgUrl)}
                                >
                                  <Feather name="x" size={12} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            );
                          })}

                          {/* Add Image Button */}
                          <TouchableOpacity 
                            style={styles.addSectionImgBtn}
                            onPress={() => handleUploadSectionImage(sId)}
                            activeOpacity={0.7}
                          >
                            <Feather name="plus" size={18} color={COLORS.gold} />
                            <Text style={styles.addSectionImgText}>+ Add Image</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Save & Delete buttons for section */}
                      <View style={styles.sectionActionsRow}>
                        <TouchableOpacity 
                          style={styles.sectionActionBtnSave}
                          onPress={() => handleSaveSection(sId)}
                        >
                          <Text style={styles.sectionActionBtnSaveText}>Save Section</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.sectionActionBtnDelete}
                          onPress={() => handleDeleteSection(sId)}
                        >
                          <Text style={styles.sectionActionBtnDeleteText}>Delete Section</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Add new history section block */}
                {!showNewSectionForm ? (
                  <TouchableOpacity 
                    style={styles.addNewSectionToggleBtn}
                    onPress={() => setShowNewSectionForm(true)}
                  >
                    <Feather name="plus-circle" size={16} color={COLORS.gold} style={{ marginRight: 8 }} />
                    <Text style={styles.addNewSectionToggleBtnText}>Add History Section</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.sectionBuilderCard, { borderColor: COLORS.gold, borderStyle: 'dashed' }]}>
                    <View style={styles.sectionCardHeader}>
                      <Text style={[styles.sectionCardTitle, { color: COLORS.gold }]}>NEW HISTORY SECTION</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Section Title</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="e.g. Architectural Sculptures"
                        placeholderTextColor={COLORS.textSecondary}
                        value={newSectionTitle}
                        onChangeText={setNewSectionTitle}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Detailed Content</Text>
                      <TextInput
                        style={[styles.textInputArea, { minHeight: 80 }]}
                        multiline
                        placeholder="Enter section description..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={newSectionContent}
                        onChangeText={setNewSectionContent}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Order (e.g. 1, 2, 3)</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="e.g. 1"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                        value={newSectionOrder}
                        onChangeText={setNewSectionOrder}
                      />
                    </View>

                    <View style={styles.sectionActionsRow}>
                      <TouchableOpacity 
                        style={styles.sectionActionBtnSave}
                        onPress={handleCreateNewSection}
                      >
                        <Text style={styles.sectionActionBtnSaveText}>Create Section</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.sectionActionBtnDelete, { backgroundColor: COLORS.surface }]}
                        onPress={() => setShowNewSectionForm(false)}
                      >
                        <Text style={[styles.sectionActionBtnDeleteText, { color: COLORS.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* MONUMENT GALLERY PHOTOGRAPHS SECTION */}
            <View style={styles.sectionHeader}> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
              <Text style={styles.sectionHeaderTitle}>MONUMENT GALLERY PHOTOGRAPHS</Text> 
              <Text style={styles.sectionHeaderLine}>---------------------------------------</Text> 
            </View>

            <TouchableOpacity 
              style={styles.dropdownBtn} 
              onPress={() => setIsGalleryCollapsibleOpen(!isGalleryCollapsibleOpen)} 
              activeOpacity={0.8} 
            > 
              <View style={styles.dropdownBtnContent}> 
                <Feather name="image" size={16} color={COLORS.gold} style={{ marginRight: 8 }} /> 
                <Text style={styles.dropdownBtnText}>
                  {isGalleryCollapsibleOpen ? 'Close Photographs Manager' : 'Open Photographs Manager'}
                </Text> 
              </View> 
              <Feather name={isGalleryCollapsibleOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /> 
            </TouchableOpacity>

            {isGalleryCollapsibleOpen && (
              <View style={styles.editorFormContainer}>
                {isGalleryLoading && (
                  <View style={styles.historyLoader}>
                    <ActivityIndicator size="small" color={COLORS.gold} />
                    <Text style={styles.historyLoaderText}>Updating photo gallery...</Text>
                  </View>
                )}

                {/* Categories Tabs Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                  {[
                    { key: 'historical', label: 'Historical / Archival' },
                    { key: 'modern', label: 'Modern Photos' },
                    { key: 'architecture', label: 'Architecture' },
                    { key: 'sculpture', label: 'Sculptures' },
                    { key: 'inscription', label: 'Inscriptions' },
                    { key: 'restoration', label: 'Restoration' }
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabBtn,
                        activeGalleryTab === tab.key && styles.tabBtnActive,
                        { marginRight: 8, height: 32 }
                      ]}
                      onPress={() => {
                        setActiveGalleryTab(tab.key as any);
                        setEditingImageId(null);
                      }}
                    >
                      <Text style={[
                        styles.tabBtnText,
                        activeGalleryTab === tab.key && styles.tabBtnTextActive
                      ]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Render photos in the active category */}
                <Text style={[styles.inputLabel, { marginBottom: SPACING.sm }]}>
                  Existing images ({
                    activeGalleryTab === 'historical' ? (selectedMonument?.historicalImages || []).length :
                    activeGalleryTab === 'modern' ? (selectedMonument?.modernImages || []).length :
                    activeGalleryTab === 'architecture' ? (selectedMonument?.architectureImages || []).length :
                    activeGalleryTab === 'sculpture' ? (selectedMonument?.sculptureImages || []).length :
                    activeGalleryTab === 'inscription' ? (selectedMonument?.inscriptionImages || []).length :
                    activeGalleryTab === 'restoration' ? (selectedMonument?.restorationImages || []).length : 0
                  })
                </Text>

                <View style={{ gap: SPACING.md }}>
                  {((
                    activeGalleryTab === 'historical' ? (selectedMonument?.historicalImages || []) :
                    activeGalleryTab === 'modern' ? (selectedMonument?.modernImages || []) :
                    activeGalleryTab === 'architecture' ? (selectedMonument?.architectureImages || []) :
                    activeGalleryTab === 'sculpture' ? (selectedMonument?.sculptureImages || []) :
                    activeGalleryTab === 'inscription' ? (selectedMonument?.inscriptionImages || []) :
                    activeGalleryTab === 'restoration' ? (selectedMonument?.restorationImages || []) : []
                  ) as ApiMonumentImage[]).map((img, index) => {
                    const isEditingThis = editingImageId === img._id || editingImageId === img.id;
                    return (
                      <View key={img._id || img.id || String(index)} style={{ backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm }}>
                        <View style={{ flexDirection: 'row', gap: SPACING.md, alignItems: 'center' }}>
                          <Image source={{ uri: getImageUrl(img.imageUrl) }} style={{ width: 80, height: 80, borderRadius: BORDER_RADIUS.sm, resizeMode: 'cover' }} />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall, fontWeight: '700' }}>
                              {img.title || 'Untitled Photograph'}
                            </Text>
                            {img.year && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Year: {img.year}</Text>}
                            {img.photographer && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Photographer: {img.photographer}</Text>}
                            {img.source && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Source: {img.source}</Text>}
                            {img.credit && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Credit: {img.credit}</Text>}
                            {img.license && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>License: {img.license}</Text>}
                          </View>
                        </View>

                        {/* Inline Metadata Editing Form */}
                        {isEditingThis ? (
                          <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, gap: SPACING.sm }}>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Title</Text>
                              <TextInput
                                style={styles.textInputLine}
                                value={editingImageForm.title}
                                onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, title: val }))}
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Description</Text>
                              <TextInput
                                style={styles.textInputLine}
                                value={editingImageForm.description}
                                onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, description: val }))}
                              />
                            </View>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Year</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.year}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, year: val }))}
                                />
                              </View>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Photographer</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.photographer}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, photographer: val }))}
                                />
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Source</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.source}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, source: val }))}
                                />
                              </View>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Source URL</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.sourceUrl}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, sourceUrl: val }))}
                                />
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Credit</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.credit}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, credit: val }))}
                                />
                              </View>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>License</Text>
                                <TextInput
                                  style={styles.textInputLine}
                                  value={editingImageForm.license}
                                  onChangeText={(val) => setEditingImageForm((prev: any) => ({ ...prev, license: val }))}
                                />
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                              <TouchableOpacity
                                style={styles.sectionActionBtnSave}
                                onPress={() => handleUpdateGalleryImageMetadata(img._id || img.id || '')}
                              >
                                <Text style={styles.sectionActionBtnSaveText}>Update</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.sectionActionBtnDelete, { backgroundColor: COLORS.surface }]}
                                onPress={() => setEditingImageId(null)}
                              >
                                <Text style={[styles.sectionActionBtnDeleteText, { color: COLORS.textSecondary }]}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.xs }}>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
                              onPress={() => {
                                setEditingImageId(img._id || img.id || '');
                                setEditingImageForm({
                                  title: img.title || '',
                                  description: img.description || '',
                                  source: img.source || '',
                                  sourceUrl: img.sourceUrl || '',
                                  photographer: img.photographer || '',
                                  year: img.year || '',
                                  credit: img.credit || '',
                                  license: img.license || ''
                                });
                              }}
                            >
                              <Feather name="edit-2" size={12} color={COLORS.gold} />
                              <Text style={{ color: COLORS.gold, fontSize: 11, fontWeight: '600' }}>Edit Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
                              onPress={() => handleDeleteGalleryImage(img._id || img.id || '')}
                            >
                              <Feather name="trash-2" size={12} color={COLORS.danger} />
                              <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '600' }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {((
                    activeGalleryTab === 'historical' ? (selectedMonument?.historicalImages || []) :
                    activeGalleryTab === 'modern' ? (selectedMonument?.modernImages || []) :
                    activeGalleryTab === 'architecture' ? (selectedMonument?.architectureImages || []) :
                    activeGalleryTab === 'sculpture' ? (selectedMonument?.sculptureImages || []) :
                    activeGalleryTab === 'inscription' ? (selectedMonument?.inscriptionImages || []) :
                    activeGalleryTab === 'restoration' ? (selectedMonument?.restorationImages || []) : []
                  ) || []).length === 0 && (
                    <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: SPACING.md }}>
                      No photos added to this category yet.
                    </Text>
                  )}
                </View>

                {/* AI Image Discovery Section */}
                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.md }}>
                  <Text style={{ color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, fontWeight: '700' }}>AI Photograph Discovery</Text>
                  <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption }}>
                    Search the web using Gemini Search Grounding to find verified historical, archival, architectural, and modern photograph references for this monument.
                  </Text>
                  
                  {isDiscoveringImages ? (
                    <View style={styles.historyLoader}>
                      <ActivityIndicator size="small" color={COLORS.gold} />
                      <Text style={styles.historyLoaderText}>Searching and verifying reference archives...</Text>
                      <TouchableOpacity 
                        style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 4 }}
                        onPress={handleCancelDiscoverImages}
                      >
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: COLORS.surfaceLight, opacity: isDiscoveringImages ? 0.5 : 1 }]}
                      onPress={handleDiscoverImages}
                      disabled={isDiscoveringImages}
                    >
                      <Text style={styles.pickerBtnText}>🔍 Discover Photograph References</Text>
                    </TouchableOpacity>
                  )}

                  {discoveredImages.length > 0 && (
                    <View style={{ gap: SPACING.md, marginTop: SPACING.sm }}>
                      <Text style={{ color: COLORS.textPrimary, ...TYPOGRAPHY.caption, fontWeight: '700' }}>
                        Discovered Photo Candidates ({discoveredImages.length}):
                      </Text>
                      
                      {discoveredImages.map((img, idx) => (
                        <View key={idx} style={{ backgroundColor: COLORS.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.gold, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm }}>
                          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                            <Image source={{ uri: getImageUrl(img.imageUrl) }} style={{ width: 90, height: 90, borderRadius: BORDER_RADIUS.sm, resizeMode: 'cover' }} />
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ color: COLORS.textPrimary, ...TYPOGRAPHY.bodySmall, fontWeight: '700' }}>
                                {img.title || 'Discovered Photo'}
                              </Text>
                              <Text style={{ color: COLORS.gold, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>
                                Type: {img.imageType}
                              </Text>
                              {img.year && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Year: {img.year}</Text>}
                              {img.photographer && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Photographer: {img.photographer}</Text>}
                              {img.source && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>Source: {img.source}</Text>}
                              {img.license && <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>License: {img.license}</Text>}
                            </View>
                          </View>
                          
                          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.xs }}>
                            {img.sourceUrl ? (
                              <TouchableOpacity
                                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm }}
                                onPress={() => Linking.openURL(img.sourceUrl!)}
                              >
                                <Text style={{ color: COLORS.textPrimary, fontSize: 10, fontWeight: '600' }}>View Source</Text>
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.sm }}
                              onPress={() => handleApproveDiscoveredImage(img)}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.danger, borderRadius: BORDER_RADIUS.sm }}
                              onPress={() => handleRejectDiscoveredImage(img.imageUrl)}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Upload Form Section */}
                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.md }}>
                  <Text style={{ color: COLORS.gold, ...TYPOGRAPHY.bodyMedium, fontWeight: '700' }}>Add Photograph</Text>
                  
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={handlePickGalleryImage}
                  >
                    <Text style={styles.pickerBtnText}>📷 Pick Gallery Photo</Text>
                  </TouchableOpacity>

                  {galleryImageUri && (
                    <View style={styles.previewSection}>
                      <View style={styles.previewCard}>
                        <Image source={{ uri: galleryImageUri }} style={styles.previewImage} />
                        <View style={styles.previewDetails}>
                          <Text style={styles.detailText} numberOfLines={1}>
                            <Text style={styles.detailLabel}>File:</Text> {galleryFileInfo?.name}
                          </Text>
                          <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Size:</Text> {galleryFileInfo?.size}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInputLine}
                      placeholder="Title of photograph"
                      placeholderTextColor={COLORS.textSecondary}
                      value={galleryTitle}
                      onChangeText={setGalleryTitle}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={styles.textInputLine}
                      placeholder="Brief description of the photo"
                      placeholderTextColor={COLORS.textSecondary}
                      value={galleryDescription}
                      onChangeText={setGalleryDescription}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Year</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="Year (e.g. 1912, 2024)"
                        placeholderTextColor={COLORS.textSecondary}
                        value={galleryYear}
                        onChangeText={setGalleryYear}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Photographer</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="Name of photographer"
                        placeholderTextColor={COLORS.textSecondary}
                        value={galleryPhotographer}
                        onChangeText={setGalleryPhotographer}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Source</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="Source archive/museum"
                        placeholderTextColor={COLORS.textSecondary}
                        value={gallerySource}
                        onChangeText={setGallerySource}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Source URL</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="URL to source page"
                        placeholderTextColor={COLORS.textSecondary}
                        value={gallerySourceUrl}
                        onChangeText={setGallerySourceUrl}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Credit</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="Attribution / Credit line"
                        placeholderTextColor={COLORS.textSecondary}
                        value={galleryCredit}
                        onChangeText={setGalleryCredit}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>License</Text>
                      <TextInput
                        style={styles.textInputLine}
                        placeholder="e.g. CC BY-SA 4.0, Public Domain"
                        placeholderTextColor={COLORS.textSecondary}
                        value={galleryLicense}
                        onChangeText={setGalleryLicense}
                      />
                    </View>
                  </View>

                  <PrimaryButton
                    title="Upload Gallery Photo"
                    onPress={handleUploadGalleryImage}
                    disabled={!galleryImageUri || !selectedMonument}
                    style={{ marginTop: SPACING.sm }}
                  />
                </View>
              </View>
            )}
          </View>
        )} 
      </ScrollView> 
 
      {/* Monument Selection Sheet (Modal) */} 
      <Modal visible={isPickerVisible} animationType="slide" transparent> 
        <View style={styles.modalOverlay}> 
          <View style={styles.modalContent}> 
            <View style={styles.modalHeader}> 
              <Text style={styles.modalTitle}>Choose Monument</Text> 
              <TouchableOpacity onPress={() => setIsPickerVisible(false)}> 
                <Feather name="x" size={22} color={COLORS.textPrimary} /> 
              </TouchableOpacity> 
            </View> 
             
            <FlatList 
              data={monuments} 
              keyExtractor={(item) => item._id} 
              renderItem={renderMonumentItem} 
              contentContainerStyle={styles.modalList} 
            /> 
          </View> 
        </View> 
      </Modal> 
    </SafeAreaView> 
  ); 
}; 
 
const styles = StyleSheet.create({ 
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
  }, 
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
  }, 
  backButton: { 
    padding: SPACING.xs, 
    marginRight: SPACING.md, 
  }, 
  headerTitle: { 
    color: COLORS.textPrimary, 
    ...TYPOGRAPHY.h3, 
    fontWeight: '700', 
  }, 
  headerSubtitle: { 
    color: COLORS.textSecondary, 
    ...TYPOGRAPHY.caption, 
    fontSize: 10, 
    marginTop: 2, 
  }, 
  scrollContent: { 
    paddingBottom: SPACING.xxl, 
  }, 
  centeredContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 100, 
    gap: SPACING.md, 
  }, 
  statusText: { 
    color: COLORS.textSecondary, 
    ...TYPOGRAPHY.bodyMedium, 
  }, 
  formContainer: { 
    padding: SPACING.lg, 
    gap: SPACING.md, 
  }, 
  sectionHeader: { 
    marginVertical: SPACING.xs, 
  }, 
  sectionHeaderLine: { 
    color: COLORS.border, 
    fontSize: 12, 
    letterSpacing: -1, 
  }, 
  sectionHeaderTitle: { 
    color: COLORS.goldMuted, 
    ...TYPOGRAPHY.caption, 
    fontWeight: '700', 
    letterSpacing: 1.5, 
    marginTop: 2, 
  }, 
  dropdownBtn: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    borderColor: COLORS.border, 
    borderWidth: 1, 
    borderRadius: BORDER_RADIUS.md, 
    height: 48, 
    paddingHorizontal: SPACING.md, 
  }, 
  dropdownBtnContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  }, 
  dropdownBtnText: { 
    color: COLORS.textPrimary, 
    ...TYPOGRAPHY.bodyMedium, 
    fontWeight: '600', 
  }, 
  currentImageWrapper: { 
    width: '100%', 
    height: 180, 
    borderRadius: BORDER_RADIUS.lg, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    overflow: 'hidden', 
    position: 'relative', 
    backgroundColor: COLORS.surface, 
  }, 
  currentImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover', 
  }, 
  currentImageText: { 
    position: 'absolute', 
    bottom: SPACING.sm, 
    right: SPACING.sm, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    color: COLORS.gold, 
    paddingHorizontal: SPACING.md, 
    paddingVertical: 4, 
    borderRadius: BORDER_RADIUS.sm, 
    fontSize: 10, 
    fontWeight: '700', 
  }, 
  noCurrentImageBox: { 
    width: '100%', 
    height: 120, 
    borderRadius: BORDER_RADIUS.lg, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderStyle: 'dashed', 
    backgroundColor: COLORS.surface, 
    justifyContent: 'center', 
    alignItems: 'center', 
  }, 
  noCurrentImageText: { 
    color: COLORS.textSecondary, 
    ...TYPOGRAPHY.caption, 
    fontWeight: '600', 
  }, 
  pickerBtn: { 
    backgroundColor: COLORS.surfaceLight, 
    borderWidth: 1, 
    borderColor: COLORS.gold, 
    borderRadius: BORDER_RADIUS.md, 
    height: 48, 
    justifyContent: 'center', 
    alignItems: 'center', 
  }, 
  pickerBtnText: { 
    color: COLORS.gold, 
    ...TYPOGRAPHY.bodyMedium, 
    fontWeight: '700', 
  }, 
  previewSection: { 
    width: '100%', 
    gap: SPACING.md, 
  }, 
  previewLabel: { 
    color: COLORS.goldMuted, 
    ...TYPOGRAPHY.caption, 
    fontWeight: '700', 
  }, 
  previewCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.surface, 
    borderColor: COLORS.border, 
    borderWidth: 1, 
    borderRadius: BORDER_RADIUS.lg, 
    padding: SPACING.md, 
    alignItems: 'center', 
    gap: SPACING.md, 
  }, 
  previewImage: { 
    width: 80, 
    height: 80, 
    borderRadius: BORDER_RADIUS.md, 
    resizeMode: 'cover', 
  }, 
  previewDetails: { 
    flex: 1, 
    gap: 4, 
  }, 
  detailText: { 
    color: COLORS.textPrimary, 
    ...TYPOGRAPHY.bodySmall, 
    fontSize: 11, 
  }, 
  detailLabel: { 
    color: COLORS.textSecondary, 
    fontWeight: '700', 
  }, 
  successBanner: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.success, 
    borderRadius: BORDER_RADIUS.md, 
    padding: SPACING.md, 
    alignItems: 'center', 
  }, 
  successText: { 
    color: '#FFF', 
    ...TYPOGRAPHY.bodySmall, 
    fontWeight: '600', 
    flex: 1, 
  }, 
  errorBanner: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.danger, 
    borderRadius: BORDER_RADIUS.md, 
    padding: SPACING.md, 
    alignItems: 'center', 
  }, 
  errorText: { 
    color: '#FFF', 
    ...TYPOGRAPHY.bodySmall, 
    fontWeight: '600', 
    flex: 1, 
  }, 
  uploadBtn: { 
    marginTop: SPACING.sm, 
  }, 
  uploadingContainer: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.surface, 
    borderColor: COLORS.border, 
    borderWidth: 1, 
    borderRadius: BORDER_RADIUS.md, 
    padding: SPACING.md, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: SPACING.md, 
    marginTop: SPACING.sm, 
  }, 
  uploadingText: { 
    color: COLORS.goldMuted, 
    ...TYPOGRAPHY.bodySmall, 
    fontWeight: '600', 
  }, 
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.85)', 
    justifyContent: 'flex-end', 
  }, 
  modalContent: { 
    backgroundColor: COLORS.surface, 
    borderTopLeftRadius: BORDER_RADIUS.xl, 
    borderTopRightRadius: BORDER_RADIUS.xl, 
    maxHeight: '75%', 
    borderWidth: 1, 
    borderColor: COLORS.border, 
  }, 
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: SPACING.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
  }, 
  modalTitle: { 
    color: COLORS.textPrimary, 
    ...TYPOGRAPHY.h3, 
    fontWeight: '700', 
  }, 
  modalList: { 
    paddingBottom: SPACING.xl, 
  }, 
  monumentSelectItem: { 
    padding: SPACING.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
  }, 
  monumentSelectItemActive: { 
    backgroundColor: 'rgba(212, 175, 55, 0.1)', 
  }, 
  monumentSelectItemText: { 
    color: COLORS.textPrimary, 
    ...TYPOGRAPHY.bodyMedium, 
    fontWeight: '600', 
  }, 
  monumentSelectItemSubtext: { 
    color: COLORS.textSecondary, 
    ...TYPOGRAPHY.caption, 
    marginTop: 2, 
  }, 
  deleteBtn: {
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  deleteBtnText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
  currentModelWrapper: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    width: '100%',
  },
  currentModelText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentModelFilename: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: 2,
    width: '90%',
  },
  editorFormContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  inputGroup: {
    gap: 6,
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    color: COLORS.goldMuted,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  textInputArea: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.textPrimary,
    padding: SPACING.md,
    ...TYPOGRAPHY.bodyMedium,
    textAlignVertical: 'top',
  },
  historyBuilderContainer: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  historyLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.gold,
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  historyLoaderText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
  },
  sectionBuilderCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
    marginBottom: 6,
  },
  sectionCardTitle: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textInputLine: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    height: 40,
    ...TYPOGRAPHY.bodyMedium,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
  },
  sectionImageWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImgBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(235, 87, 87, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSectionImgBtn: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 4,
  },
  addSectionImgText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionActionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionActionBtnSave: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.md,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionActionBtnSaveText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionActionBtnDelete: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionActionBtnDeleteText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button,
    fontWeight: '700',
    fontSize: 12,
  },
  addNewSectionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    height: 48,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
  },
  addNewSectionToggleBtnText: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
  },
  tabBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    height: 38,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  tabBtnText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: COLORS.background,
    fontWeight: '700',
  },
  groupHeading: {
    color: COLORS.gold,
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  recImageCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  recImageThumb: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    resizeMode: 'cover',
  },
  recImageTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
  },
  recImageMeta: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    marginTop: 2,
  },
  deleteRecBtn: {
    padding: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.bodySmall,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
}); 
export default AdminUploadScreen; 