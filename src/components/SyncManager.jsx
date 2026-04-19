import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCcw, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { offlineStorage } from '../services/offlineStorage';
import { createInspection } from '../services/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const SyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkQueue = async () => {
    const queue = await offlineStorage.getSyncQueue();
    setQueueCount(queue.length);
    if (queue.length > 0 && navigator.onLine) {
      processQueue();
    }
  };

  const processQueue = async () => {
    if (syncing || !navigator.onLine) return;
    
    const queue = await offlineStorage.getSyncQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    setShowNotification(true);

    try {
      for (const item of queue) {
        try {
          if (item.type === 'inspection') {
            const inspectionData = item.data;
            
            // If there are base64 images, we should ideally upload them to Storage here
            // and replace base64 with URLs. 
            // For simplicity in this MVP sync, we'll try to save directly if small 
            // or implement basic storage upload.
            
            const uploadedImages = [];
            for (const img of inspectionData.images) {
              if (img.image.startsWith('data:')) {
                const storagePath = `inspections/${inspectionData.vehicleId}/${Date.now()}_${img.id}.jpg`;
                const storageRef = ref(storage, storagePath);
                await uploadString(storageRef, img.image, 'data_url');
                const url = await getDownloadURL(storageRef);
                uploadedImages.push({ ...img, image: url });
              } else {
                uploadedImages.push(img);
              }
            }

            const finalData = {
              ...inspectionData,
              images: uploadedImages,
              syncedAt: new Date().toISOString()
            };

            await createInspection(finalData);
            await offlineStorage.markAsSynced('inspection', item.id);
          }
          
          // Refresh count after each success
          const remaining = await offlineStorage.getSyncQueue();
          setQueueCount(remaining.length);
        } catch (err) {
          console.error('Error syncing individual item:', err);
          await offlineStorage.retrySync(item.id);
        }
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  if (queueCount === 0 && !syncing) return null;

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 flex items-center space-x-4 min-w-[300px]"
        >
          {syncing ? (
            <RefreshCcw className="w-5 h-5 text-primary-400 animate-spin" />
          ) : (
            <Check className="w-5 h-5 text-green-400" />
          )}
          <div className="flex-1">
            <p className="text-sm font-bold">
              {syncing ? 'Synchronisation en cours...' : 'Données synchronisées'}
            </p>
            <p className="text-xs text-gray-400">
              {queueCount} élément{queueCount > 1 ? 's' : ''} en attente
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SyncManager;
