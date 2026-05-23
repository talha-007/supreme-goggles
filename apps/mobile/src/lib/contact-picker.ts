import Constants from "expo-constants";

type PickedContact = {
  phoneNumbers?: Array<{ number?: string | null } | null> | null;
};

function firstPhoneNumber(contact: PickedContact): string | null {
  const raw = contact.phoneNumbers?.[0]?.number ?? null;
  if (!raw) return null;
  const normalized = String(raw).trim();
  return normalized.length > 0 ? normalized : null;
}

export async function pickPhoneFromContacts(): Promise<{
  phone?: string;
  error?: string;
  cancelled?: true;
}> {
  if (Constants.appOwnership === "expo") {
    return {
      error:
        "Contact picker needs a development build. Please run the dev build app and try again.",
    };
  }

  try {
    const Contacts = await import("expo-contacts");
    const current = await Contacts.getPermissionsAsync();
    const granted = current.granted || (await Contacts.requestPermissionsAsync()).granted;
    if (!granted) {
      return { error: "Contacts permission is required to pick a phone number." };
    }

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return { cancelled: true };

    const phone = firstPhoneNumber(contact as PickedContact);
    if (!phone) {
      return { error: "Selected contact has no phone number." };
    }
    return { phone };
  } catch {
    return { error: "Contacts module is unavailable. Rebuild or reinstall the app to enable contact picking." };
  }
}
