import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import { store } from './store/store';
import theme from './theme/theme';
import App from './App';

test('renders Salesman Tracker login header', async () => {
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </Provider>
  );
  const headings = await screen.findAllByText(/Salesman Tracker/i);
  expect(headings.length).toBeGreaterThan(0);
});

