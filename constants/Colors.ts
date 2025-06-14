/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';


export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  PRIMARY: '#07004D',
  GRAY:'#8f8f8f',
  SECONDARY:'#A41623',
  WHITE:'#FFFFFF',
  BLACK:'#000000',
  LIGHT:'#EB8A90',
  Appname:'Bus Tracker',
  Creator:'Om Shrikhande',
  BORDER:'#edbc09',
  SUCCESS: '#28a745', // Green for reached stop
  WARNING: '#ffc107', // Yellow for the next stop
  LIGHT_GREY: '#d3d3d3', // Grey for stops behind the reached stop
  DARK: '#343a40', // Default dark color for text
  GREY: '#6c757d', // Grey for not reached stops and line
};
