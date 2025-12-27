import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Loader2, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface AffiliateCodeInputProps {
  value: string;
  onChange: (code: string, affiliateName: string | null) => void;
}

export function AffiliateCodeInput({ value, onChange }: AffiliateCodeInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  
  const debouncedCode = useDebounce(value, 500);

  const validateCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setAffiliateName(null);
      setIsValid(null);
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('affiliate_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const name = data.full_name || data.email || 'Unknown Affiliate';
        setAffiliateName(name);
        setIsValid(true);
        onChange(code.toUpperCase(), name);
      } else {
        setAffiliateName(null);
        setIsValid(false);
        onChange(code.toUpperCase(), null);
      }
    } catch (error) {
      console.error('Error validating affiliate code:', error);
      setAffiliateName(null);
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  }, [onChange]);

  useEffect(() => {
    validateCode(debouncedCode);
  }, [debouncedCode, validateCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    // Reset validation state when user types a new code
    setAffiliateName(null);
    setIsValid(null);
    onChange(newCode, null);
  };

  const handleClear = () => {
    setAffiliateName(null);
    setIsValid(null);
    onChange('', null);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link className="h-4 w-4" />
          Affiliate Referral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="affiliate-code" className="text-sm text-muted-foreground">
            Affiliate Code (optional)
          </Label>
          <div className="relative">
            <Input
              id="affiliate-code"
              placeholder="Enter affiliate code"
              value={value}
              onChange={handleChange}
              className="pr-16 uppercase"
              maxLength={20}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isValidating && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isValidating && isValid === true && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {!isValidating && value.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                  aria-label="Clear affiliate code"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {affiliateName && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Referred by: {affiliateName}
          </p>
        )}
        
        {isValid === false && value.trim() && !isValidating && (
          <p className="text-sm text-destructive">
            Invalid affiliate code - click X to clear
          </p>
        )}
      </CardContent>
    </Card>
  );
}
