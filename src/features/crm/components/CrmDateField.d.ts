export interface CrmDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  time?: boolean;
}
export declare function CrmDateField(props: CrmDateFieldProps): import('react').ReactElement;
