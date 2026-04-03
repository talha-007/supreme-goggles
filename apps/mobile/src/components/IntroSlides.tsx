import { useCallback, useRef, useState } from "react";
import { useWindowDimensions, Pressable, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import Animated, { FadeIn } from "react-native-reanimated";

const SLIDES = [
  {
    title: "Retail SaaS",
    body:
      "Sales, stock, and purchasing in one place — built for shops and retail counters.",
    accent: "POS",
  },
  {
    title: "Sell & track inventory",
    body:
      "Invoices update stock when you complete a sale. See low stock before you run out, and keep your catalog under control.",
    accent: "Stock",
  },
  {
    title: "Customers & suppliers",
    body:
      "Manage buyers and credit limits, create bills and track payments, and order from suppliers with purchase orders.",
    accent: "Hub",
  },
] as const;

type Props = {
  onDone: () => void;
};

export function IntroSlides({ onDone }: Props) {
  const { width: pageW } = useWindowDimensions();
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  const goNext = useCallback(() => {
    if (page < SLIDES.length - 1) {
      pager.current?.setPage(page + 1);
    } else {
      onDone();
    }
  }, [page, onDone]);

  return (
    <View className="flex-1 bg-neutral-950">
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {SLIDES.map((slide, i) => (
          <View
            key={slide.title}
            className="flex-1 justify-center px-8"
            style={{ width: pageW }}
          >
            <Animated.View entering={FadeIn.duration(420)}>
              <View className="mb-6 self-start rounded-2xl bg-emerald-500/15 px-4 py-2">
                <Text className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                  {slide.accent}
                </Text>
              </View>
              <Text className="text-3xl font-bold leading-tight text-neutral-100">
                {slide.title}
              </Text>
              <Text className="mt-4 text-base leading-relaxed text-neutral-400">
                {slide.body}
              </Text>
            </Animated.View>
          </View>
        ))}
      </PagerView>

      <View className="flex-row items-center justify-center gap-2 pb-4">
        {SLIDES.map((_, i) => (
          <View
            key={String(i)}
            className={`h-2 rounded-full ${i === page ? "w-8 bg-emerald-500" : "w-2 bg-neutral-700"}`}
          />
        ))}
      </View>

      <View className="border-t border-neutral-800 px-6 pb-10 pt-4">
        <Pressable
          onPress={goNext}
          className="rounded-xl bg-emerald-600 px-4 py-4 active:opacity-90"
        >
          <Text className="text-center text-base font-semibold text-white">
            {page < SLIDES.length - 1 ? "Next" : "Get started"}
          </Text>
        </Pressable>
        {page < SLIDES.length - 1 ? (
          <Pressable onPress={onDone} className="mt-4 py-2">
            <Text className="text-center text-sm text-neutral-500">Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
