import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Pick an image and upload it to the user's own folder in the public `photos` bucket. Returns the public URL. */
export async function pickAndUploadPhoto(userId: string): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  const name = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(name, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(name).data.publicUrl;
}
