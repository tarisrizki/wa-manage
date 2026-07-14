import { useState, useCallback } from 'react';

export interface GroupLink {
  originalLink: string;
  code: string;
  status: 'pending' | 'validating' | 'validated' | 'processing' | 'success' | 'skipped' | 'failed';
  message?: string;
  subject?: string;
  size?: number;
  joinApprovalMode?: boolean;
  isExpired?: boolean;
  isJoined?: boolean;
  checked?: boolean;
}

export function useGroupJoin() {
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidationDone, setIsValidationDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{ total: number, success: number, skipped: number, failed: number } | null>(null);

  const startValidation = useCallback(async (activeAccount: string, currentLinks: GroupLink[]) => {
    if (currentLinks.length === 0) return;
    
    setIsValidating(true);
    setProgress(0);

    try {
      // @ts-ignore
      const myGroups = await window.api.getGroups(activeAccount);
      const myGroupIds = new Set(myGroups.map((g: any) => g.id));

      let updatedLinks = [...currentLinks];

      for (let i = 0; i < updatedLinks.length; i++) {
        if (updatedLinks[i].status === 'validated' || updatedLinks[i].isExpired) continue;

        setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'validating' } : l));
        
        try {
          // @ts-ignore
          let result = await window.api.getGroupInviteInfo(activeAccount, updatedLinks[i].code);
          
          let retryCount = 0;
          while (!result.success && result.reason === 'socket_not_active' && retryCount < 5) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 3000));
            // @ts-ignore
            result = await window.api.getGroupInviteInfo(activeAccount, updatedLinks[i].code);
          }
          
          if (result.success) {
            const isJoined = myGroupIds.has(result.id);
            
            setLinks(prev => prev.map((l, idx) => idx === i ? { 
              ...l, 
              status: isJoined ? 'skipped' : 'validated', 
              subject: result.subject, 
              size: result.size,
              joinApprovalMode: result.joinApprovalMode,
              isExpired: false,
              isJoined: isJoined,
              checked: !isJoined && !result.joinApprovalMode 
            } : l));
          } else {
            setLinks(prev => prev.map((l, idx) => idx === i ? { 
              ...l, 
              status: 'failed', 
              message: result.reason, 
              isExpired: true, 
              checked: false 
            } : l));
          }
        } catch (err: any) {
          setLinks(prev => prev.map((l, idx) => idx === i ? { 
            ...l, 
            status: 'failed', 
            message: err?.message || 'Error', 
            isExpired: true, 
            checked: false 
          } : l));
        }
        setProgress(Math.round(((i + 1) / updatedLinks.length) * 100));
      }
      setIsValidationDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
      setProgress(100);
    }
  }, []);

  const startJoin = useCallback(async (activeAccount: string, currentLinks: GroupLink[], speedMode: 'safe' | 'normal' | 'fast') => {
    const toProcess = currentLinks.filter(l => l.checked && l.status === 'validated');
    if (toProcess.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = currentLinks.filter(l => l.status === 'skipped').length;
    
    let delayMs = 15000;
    if (speedMode === 'normal') delayMs = 7000;
    if (speedMode === 'fast') delayMs = 3000;

    for (let i = 0; i < currentLinks.length; i++) {
      if (!currentLinks[i].checked || currentLinks[i].status !== 'validated') {
        continue;
      }
      
      setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'processing' } : l));
      
      try {
        // @ts-ignore
        const result = await window.api.joinGroup(activeAccount, currentLinks[i].code);
        
        if (result.success) {
          setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'success', checked: false } : l));
          successCount++;
        } else {
          setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'failed', message: result.reason, checked: false } : l));
          failCount++;
        }
      } catch (err: any) {
        setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, status: 'failed', message: err?.message || 'Error', checked: false } : l));
        failCount++;
      }
      
      const processedSoFar = successCount + failCount;
      setProgress(Math.round((processedSoFar / toProcess.length) * 100));

      if (processedSoFar < toProcess.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs + (Math.random() * 2000)));
      }
    }
    
    setSummary({
      total: currentLinks.length,
      success: successCount,
      failed: failCount,
      skipped: currentLinks.length - (successCount + failCount)
    });
    
    setIsProcessing(false);
  }, []);

  return {
    links,
    setLinks,
    isProcessing,
    isValidating,
    isValidationDone,
    progress,
    summary,
    startValidation,
    startJoin
  };
}
