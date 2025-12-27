import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, Loader2, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateCodeInputProps {
  value: string;
  onChange: (code: string, affiliateName: string | null) => void;
}

export function AffiliateCodeInput({ value, onChange }: AffiliateCodeInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isValidating, setIsValidating] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleApply = async () => {
    const code = inputValue.trim().toUpperCase();
    if (!code) {
      setAffiliateName(null);
      setIsValid(null);
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('affiliate_code', code)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const name = data.full_name || data.email || 'Unknown Affiliate';
        setAffiliateName(name);
        setIsValid(true);
        onChange(code, name);
      } else {
        setAffiliateName(null);
        setIsValid(false);
      }
    } catch (error) {
      console.error('Error validating affiliate code:', error);
      setAffiliateName(null);
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setInputValue(newCode);
    // Reset validation state when user types
    if (isValid !== null) {
      setAffiliateName(null);
      setIsValid(null);
    }
  };

  const handleClear = () => {
    setInputValue('');
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="affiliate-code"
                placeholder="Enter affiliate code"
                value={inputValue}
                onChange={handleChange}
                className="pr-10 uppercase"
                maxLength={20}
              />
              {inputValue.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
                  aria-label="Clear affiliate code"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApply}
              disabled={!inputValue.trim() || isValidating}
              className="shrink-0"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isValid === true ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
        
        {affiliateName && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Referred by: {affiliateName}
          </p>
        )}
        
        {isValid === false && inputValue.trim() && !isValidating && (
          <p className="text-sm text-destructive">
            Invalid affiliate code
          </p>
        )}
      </CardContent>
    </Card>
  );
}
