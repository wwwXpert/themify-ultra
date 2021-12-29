<?php
if(!defined('ABSPATH'))
    exit; // Exit if accessed directly
/**
 * Template Link Block
 *
 * This template can be overridden by copying it to yourtheme/themify-builder/template-link-block.php.
 *
 * Access original fields: $args['mod_settings']
 * @author Themify
 */
$fields_default=array(
    'shape'=>'normal',
    'style'=>'solid',
    'heading'=>__('Heading', 'themify'),
    'blurb'=>'',
    'nofollow_link'=>'',
    'label'=>'',
    'link'=>'',
    'icon_type' => 'icon',
    'icon'=>'',
    'image'=>'',
    'link_options'=>false,
    'lightbox_width'=>'',
    'lightbox_height'=>'',
    'lightbox_width_unit'=>'px',
    'lightbox_height_unit'=>'px',
    'color'=>'tb_default_color',
    'title'=>'',
    'animation_effect'=>'',
    'css_class'=>''
);
$fields_args=wp_parse_args($args['mod_settings'], $fields_default);
unset($args['mod_settings'],$fields_default);
$mod_name=$args['mod_name'];
$element_id=$args['module_ID'];
$container_class=apply_filters('themify_builder_module_classes', array(
    'module',
    'module-' . $mod_name,
    $element_id,
    $fields_args['style'],
    $fields_args['css_class'],
    'tf_textc'
), $mod_name, $element_id, $fields_args);
if ($fields_args['shape']!=='normal') {
    $container_class[] = $fields_args['shape'];
    if ($fields_args['shape'] === 'rounded') {
        Themify_Builder_Model::load_appearance_css($fields_args['shape']);
    }
}
if(!empty($fields_args['global_styles']) && Themify_Builder::$frontedit_active===false) {
    $container_class[]=$fields_args['global_styles'];
}
$container_props=apply_filters('themify_builder_module_container_props', self::parse_animation_effect($fields_args, array(
    'class'=>implode(' ', $container_class),
)), $fields_args, $mod_name, $element_id);
if(Themify_Builder::$frontedit_active===false) {
    $container_props['data-lazy']=1;
}
Themify_Builder_Model::load_color_css($fields_args['color']);
?>
<!-- module link_block -->
<div <?php echo self::get_element_attributes(self::sticky_element_props($container_props, $fields_args)); ?>>
    <?php
    do_action('themify_builder_background_styling', $args['builder_id'], array(
        'styling'=>$fields_args,
        'mod_name'=>$mod_name
    ), $element_id, 'module');
	
    $container_props=$container_class=$args=null;

    $link_attr=array();
    $link_css_clsss=array('tb_link_block_container ui ' . $fields_args['color']);
    if($fields_args['link_options']==='lightbox') {
        $link_css_clsss[]='themify_lightbox';
        if($fields_args['lightbox_width']!=='' || $fields_args['lightbox_height']!=='') {
            $lightbox_settings=array();
            if($fields_args['lightbox_width']!=='') {
                $lightbox_settings[]=$fields_args['lightbox_width'] . $fields_args['lightbox_width_unit'];
            }
            if($fields_args['lightbox_height']!=='') {
                $lightbox_settings[]=$fields_args['lightbox_height'] . $fields_args['lightbox_height_unit'];
            }
            $link_attr[]=sprintf('data-zoom-config="%s"', implode('|', $lightbox_settings));
			unset($lightbox_settings);
        }
    } 
	elseif($fields_args['link_options']==='newtab') {
        $nofollow=$fields_args['nofollow_link']==='yes' ? 'nofollow ' : '';
        $link_attr[]='target="_blank" rel="' . $nofollow . 'noopener"';
    }
    if($fields_args['nofollow_link']==='yes' && $fields_args['link_options']!=='newtab') {
        $link_attr[]='rel="nofollow"';
    }
    $tag = !empty($fields_args['link']) ? 'a' : 'span';
    if('a'===$tag) {
        $link_attr[]='href="'.esc_url($fields_args['link']).'"';
        if(!empty($fields_args['title'])){
            $link_attr[]='title="'.esc_attr($fields_args['title']).'"';
        }
    }
    $link_attr[]='class="'.implode(' ', $link_css_clsss).'"';
    ?>
    <<?php echo $tag.' ',implode(' ', $link_attr) ?>>
        <?php if ('icon'===$fields_args['icon_type'] && $fields_args['icon']!==''): ?>
            <em class="tb_link_block_icon"><?php echo themify_get_icon($fields_args['icon'])?></em>
        <?php endif; ?>
        <?php if ('image'===$fields_args['icon_type'] && $fields_args['image']!==''): ?>
            <img class="tf_vmiddle tf_box tb_link_block_img" src="<?php echo $fields_args['image'] ?>"/>
        <?php endif; ?>
        <?php if(!empty($fields_args['heading'])): ?>
            <span class="tb_link_block_heading tf_block"<?php self::add_inline_edit_fields('heading')?>><?php echo $fields_args['heading'] ?></span>
        <?php endif; ?>
        <?php if(!empty($fields_args['blurb'])): ?>
            <span class="tb_link_block_blurb tf_block"<?php self::add_inline_edit_fields('blurb')?>><?php echo $fields_args['blurb'] ?></span>
        <?php endif; ?>
    </<?php echo $tag; ?>>
</div>
<!-- /module buttons -->
