import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom TipTap extension for GitCMS toolcall embedding
 * Allows embedding interactive tool calls with custom parameters
 */
export const GitCMSToolcall = Node.create({
  name: 'gitcmsToolcall',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
      },
      // Store all parameters as a JSON string in a data attribute
      // This allows us to handle any number of custom parameters
      'data-params': {
        default: null,
        parseHTML: element => element.getAttribute('data-params'),
        renderHTML: attributes => {
          if (!attributes['data-params']) {
            return {};
          }
          return {
            'data-params': attributes['data-params'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'gitcms-toolcall',
        getAttrs: element => {
          if (typeof element === 'string') return false;

          const id = element.getAttribute('id');
          if (!id) return false;

          // Extract all custom parameters (those starting with _)
          const params: Record<string, string> = {};
          Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('_')) {
              const key = attr.name.substring(1); // Remove the _ prefix
              params[key] = attr.value;
            }
          });

          return {
            id,
            'data-params': JSON.stringify(params),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Parse the stored parameters
    let params: Record<string, string> = {};
    try {
      if (HTMLAttributes['data-params']) {
        params = JSON.parse(HTMLAttributes['data-params']);
      }
    } catch (error) {
      console.error('Failed to parse toolcall params:', error);
    }

    // Build attributes object with the id and all custom parameters prefixed with _
    const attrs: Record<string, string> = {
      id: HTMLAttributes.id,
    };

    // Add all custom parameters with _ prefix
    Object.entries(params).forEach(([key, value]) => {
      attrs[`_${key}`] = value;
    });

    return ['gitcms-toolcall', mergeAttributes(attrs)];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('gitcms-toolcall-wrapper');

      // Parse parameters
      let params: Record<string, string> = {};
      try {
        if (node.attrs['data-params']) {
          params = JSON.parse(node.attrs['data-params']);
        }
      } catch (error) {
        console.error('Failed to parse toolcall params:', error);
      }

      // Create the visual representation
      const container = document.createElement('div');
      container.classList.add('gitcms-toolcall-container');

      // Header with icon and ID
      const header = document.createElement('div');
      header.classList.add('gitcms-toolcall-header');

      const icon = document.createElement('span');
      icon.classList.add('gitcms-toolcall-icon');
      icon.innerHTML = '⚡';

      const id = document.createElement('span');
      id.classList.add('gitcms-toolcall-id');
      id.textContent = node.attrs.id || 'UNKNOWN';

      const badge = document.createElement('span');
      badge.classList.add('gitcms-toolcall-badge');
      badge.textContent = 'Tool Call';

      header.appendChild(icon);
      header.appendChild(id);
      header.appendChild(badge);

      // Parameters list
      const paramsContainer = document.createElement('div');
      paramsContainer.classList.add('gitcms-toolcall-params');

      const paramCount = Object.keys(params).length;
      if (paramCount > 0) {
        const paramsList = document.createElement('div');
        paramsList.classList.add('gitcms-toolcall-params-list');

        Object.entries(params).forEach(([key, value]) => {
          const paramItem = document.createElement('div');
          paramItem.classList.add('gitcms-toolcall-param-item');

          const paramKey = document.createElement('span');
          paramKey.classList.add('gitcms-toolcall-param-key');
          paramKey.textContent = key;

          const paramSeparator = document.createElement('span');
          paramSeparator.classList.add('gitcms-toolcall-param-separator');
          paramSeparator.textContent = '=';

          const paramValue = document.createElement('span');
          paramValue.classList.add('gitcms-toolcall-param-value');
          paramValue.textContent = `"${value}"`;

          paramItem.appendChild(paramKey);
          paramItem.appendChild(paramSeparator);
          paramItem.appendChild(paramValue);
          paramsList.appendChild(paramItem);
        });

        paramsContainer.appendChild(paramsList);
      } else {
        const noParams = document.createElement('div');
        noParams.classList.add('gitcms-toolcall-no-params');
        noParams.textContent = 'No parameters';
        paramsContainer.appendChild(noParams);
      }

      container.appendChild(header);
      container.appendChild(paramsContainer);
      wrapper.appendChild(container);

      return {
        dom: wrapper,
      };
    };
  },
});
