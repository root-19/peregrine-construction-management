/**
 * Example usage of the HR Account database functions
 * 
 * This file demonstrates how to use the database functions
 * to create, read, update, and delete HR accounts.
 */

import {
  insertHRAccount,
  getAllHRAccounts,
  getHRAccountByEmail,
  updateHRAccount,
  deleteHRAccount,
} from './database';

// Example: Create a new HR account
export const createHRAccountExample = async () => {
  try {
    const accountId = await insertHRAccount(
      'John',
      'Doe',
      'john.doe@company.com',
      'securePassword123'
    );
    console.log('HR account created with ID:', accountId);
  } catch (error) {
    console.error('Failed to create HR account:', error);
  }
};

// Example: Get all HR accounts
export const getAllAccountsExample = async () => {
  try {
    const accounts = await getAllHRAccounts();
    console.log('All HR accounts:', accounts);
  } catch (error) {
    console.error('Failed to fetch HR accounts:', error);
  }
};

// Example: Get HR account by email
export const getAccountByEmailExample = async () => {
  try {
    const account = await getHRAccountByEmail('john.doe@company.com');
    if (account) {
      console.log('Found HR account:', account);
    } else {
      console.log('HR account not found');
    }
  } catch (error) {
    console.error('Failed to fetch HR account:', error);
  }
};

// Example: Update HR account
export const updateAccountExample = async () => {
  try {
    await updateHRAccount(
      1, // account ID
      'Jane',
      'Smith',
      'jane.smith@company.com',
      'newPassword456' // optional - omit if not changing password
    );
    console.log('HR account updated successfully');
  } catch (error) {
    console.error('Failed to update HR account:', error);
  }
};

// Example: Delete HR account
export const deleteAccountExample = async () => {
  try {
    await deleteHRAccount(1); // account ID
    console.log('HR account deleted successfully');
  } catch (error) {
    console.error('Failed to delete HR account:', error);
  }
};

