/* eslint-disable @typescript-eslint/no-require-imports */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReceiptImageExport } from '../src/features/sales/ReceiptImageExport';
import { SaleReceipt } from '../src/features/sales/SaleReceipt';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('../src/features/sales/SalesDesign', () => ({ money: String, PosButton: () => null }));
const data = {
  sale: { ref: 'SL-MOB-3078', total: 65 },
  company: { companyName: 'AMINST' },
  items: Array.from({ length: 65 }, (_, i) => ({ id: i, title: `Article ${i}`, qte: 1, price: 1 })),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(captureRef).mockResolvedValue('file:///cache/receipt.png');
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});
it('exports every item and the barcode beyond the screen pagination', () => {
  const screen = render(<SaleReceipt data={data} complete />);
  expect(screen.getByText('Article 64')).toBeTruthy();
  expect(screen.getByLabelText('Code-barres SL-MOB-3078')).toBeTruthy();
  expect(screen.queryByText('Partager')).toBeNull();
});
it('shares a PNG file, once, after layout', async () => {
  const done = jest.fn();
  const screen = render(<ReceiptImageExport data={data} onDone={done} />);
  const paper = screen
    .UNSAFE_getAllByType(require('react-native').View)
    .find((v) => v.props.onLayout);
  fireEvent(paper!, 'layout', { nativeEvent: { layout: { width: 320, height: 3000 } } });
  await waitFor(() => expect(done).toHaveBeenCalledWith());
  expect(captureRef).toHaveBeenCalledTimes(1);
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    'file:///cache/receipt.png',
    expect.objectContaining({ mimeType: 'image/png' }),
  );
});
it('reports unavailable sharing without capturing or sending text', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  const done = jest.fn();
  const screen = render(<ReceiptImageExport data={data} onDone={done} />);
  const paper = screen
    .UNSAFE_getAllByType(require('react-native').View)
    .find((v) => v.props.onLayout);
  fireEvent(paper!, 'layout', { nativeEvent: { layout: { width: 320, height: 3000 } } });
  await waitFor(() => expect(done).toHaveBeenCalledWith(expect.any(Error)));
  expect(captureRef).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
