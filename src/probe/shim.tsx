/**
 * Stands in for the `remotion` module while mographc bundles a project: every
 * <Composition> the project registers renders inside the probe. Everything else is
 * Remotion itself.
 */
import { useMemo, type ComponentType } from "react";
import { Composition as Original } from "remotion-original";
import { Probe } from "./Probe.tsx";

export * from "remotion-original";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = any;

const probed = (Inner: ComponentType<Props>) => (props: Props) => (
  <Probe>
    <Inner {...props} />
  </Probe>
);

export const Composition = (props: Props) => {
  const { component, lazyComponent } = props;
  const wrapped = useMemo(
    () =>
      component
        ? { component: probed(component) }
        : lazyComponent
          ? {
              lazyComponent: () =>
                lazyComponent().then(
                  (m: { default: ComponentType<Props> }) => ({
                    default: probed(m.default),
                  }),
                ),
            }
          : {},
    [component, lazyComponent],
  );
  return <Original {...props} {...wrapped} />;
};
